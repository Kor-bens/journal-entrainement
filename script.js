const daysContainer = document.getElementById('days');
const monthYearEl = document.getElementById('monthYear');
const modal = document.getElementById('modal');
const modalDateEl = document.getElementById('modalDate');
const closeBtn = document.querySelector('.close');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const addExerciseBtn = document.getElementById('addExerciseBtn');
const customExercisesContainer = document.getElementById('customExercises');
const paceDisplay = document.getElementById('paceDisplay');
const monthStats = document.getElementById('monthStats');

let currentDate = new Date();
let selectedDate = null;
let workouts = JSON.parse(localStorage.getItem('workouts') || '{}');

const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function renderCalendar() {
  daysContainer.innerHTML = '';
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthYearEl.textContent = `${months[month]} ${year}`;

  const firstDay = new Date(year, month, 1);
  let startDay = firstDay.getDay(); // 0=Sun
  startDay = startDay === 0 ? 6 : startDay - 1; // Lun=0

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty days before
  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'day empty';
    daysContainer.appendChild(empty);
  }

  const todayStr = formatDate(new Date());

  for (let d = 1; d <= daysInMonth; d++) {
    const dayEl = document.createElement('div');
    dayEl.className = 'day';
    dayEl.textContent = d;
    const dateStr = formatDate(new Date(year, month, d));

    if (dateStr === todayStr) dayEl.classList.add('today');
    if (workouts[dateStr]) dayEl.classList.add('has-data');

    dayEl.addEventListener('click', () => openModal(dateStr));
    daysContainer.appendChild(dayEl);
  }

  updateMonthStats();
}

function updateMonthStats() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  let totalKm = 0;
  let workoutDays = 0;
  let totalPompes = 0;

  Object.keys(workouts).forEach(key => {
    const [y, m] = key.split('-').map(Number);
    if (y === year && m - 1 === month) {
      workoutDays++;
      const data = workouts[key];
      if (data.running && data.running.km) totalKm += parseFloat(data.running.km) || 0;
      if (data.exercises) {
        const pompes = data.exercises.find(e => e.name.toLowerCase().includes('pompe'));
        if (pompes) totalPompes += parseInt(pompes.reps) || 0;
      }
    }
  });

  monthStats.innerHTML = `
    <strong>Ce mois :</strong> ${workoutDays} jour(s) d'entraînement · 
    ${totalKm.toFixed(1)} km de course · 
    ${totalPompes} pompes
  `;
}

function openModal(dateStr) {
  selectedDate = dateStr;
  const date = new Date(dateStr + 'T00:00:00');
  modalDateEl.textContent = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const data = workouts[dateStr] || {};

  // Predefined
  document.getElementById('pompes').value = '';
  document.getElementById('dips').value = '';
  document.getElementById('tractions').value = '';
  document.getElementById('abdos').value = '';

  customExercisesContainer.innerHTML = '';

  if (data.exercises) {
    data.exercises.forEach(ex => {
      const name = ex.name.toLowerCase();
      if (name.includes('pompe')) document.getElementById('pompes').value = ex.reps;
      else if (name.includes('dip')) document.getElementById('dips').value = ex.reps;
      else if (name.includes('traction') || name.includes('pull')) document.getElementById('tractions').value = ex.reps;
      else if (name.includes('abdo')) document.getElementById('abdos').value = ex.reps;
      else addCustomExercise(ex.name, ex.reps);
    });
  }

  // Running
  document.getElementById('runKm').value = data.running?.km || '';
  document.getElementById('runTime').value = data.running?.time || '';
  updatePace();

  document.getElementById('notes').value = data.notes || '';

  modal.classList.add('show');
}

function closeModal() {
  modal.classList.remove('show');
}

function addCustomExercise(name = '', reps = '') {
  const div = document.createElement('div');
  div.className = 'custom-exercise';
  div.innerHTML = `
    <input type="text" placeholder="Nom de l'exercice" value="${name}">
    <input type="number" placeholder="reps" min="0" value="${reps}">
    <button type="button" class="remove-ex">×</button>
  `;
  div.querySelector('.remove-ex').onclick = () => div.remove();
  customExercisesContainer.appendChild(div);
}

function updatePace() {
  const km = parseFloat(document.getElementById('runKm').value);
  const time = parseFloat(document.getElementById('runTime').value);
  if (km > 0 && time > 0) {
    const pace = time / km;
    const min = Math.floor(pace);
    const sec = Math.round((pace - min) * 60);
    paceDisplay.textContent = `${min}:${sec.toString().padStart(2,'0')}`;
  } else {
    paceDisplay.textContent = '—';
  }
}

document.getElementById('runKm').addEventListener('input', updatePace);
document.getElementById('runTime').addEventListener('input', updatePace);

function saveWorkout() {
  if (!selectedDate) return;

  const exercises = [];

  const pompes = document.getElementById('pompes').value;
  if (pompes) exercises.push({ name: 'Pompes', reps: pompes });
  const dips = document.getElementById('dips').value;
  if (dips) exercises.push({ name: 'Dips', reps: dips });
  const tractions = document.getElementById('tractions').value;
  if (tractions) exercises.push({ name: 'Tractions', reps: tractions });
  const abdos = document.getElementById('abdos').value;
  if (abdos) exercises.push({ name: 'Abdos', reps: abdos });

  customExercisesContainer.querySelectorAll('.custom-exercise').forEach(div => {
    const name = div.querySelector('input[type="text"]').value.trim();
    const reps = div.querySelector('input[type="number"]').value;
    if (name && reps) exercises.push({ name, reps });
  });

  const km = document.getElementById('runKm').value;
  const time = document.getElementById('runTime').value;
  const notes = document.getElementById('notes').value;

  const data = {};
  if (exercises.length) data.exercises = exercises;
  if (km || time) {
    data.running = { km: km || null, time: time || null };
    if (km && time) {
      const pace = parseFloat(time) / parseFloat(km);
      data.running.pace = pace.toFixed(2);
    }
  }
  if (notes) data.notes = notes;

  if (Object.keys(data).length === 0) {
    delete workouts[selectedDate];
  } else {
    workouts[selectedDate] = data;
  }

  localStorage.setItem('workouts', JSON.stringify(workouts));
  closeModal();
  renderCalendar();
}

function clearDay() {
  if (selectedDate && confirm('Effacer toutes les données de ce jour ?')) {
    delete workouts[selectedDate];
    localStorage.setItem('workouts', JSON.stringify(workouts));
    closeModal();
    renderCalendar();
  }
}

// Events
document.getElementById('prevMonth').onclick = () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
};
document.getElementById('nextMonth').onclick = () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
};
document.getElementById('todayBtn').onclick = () => {
  currentDate = new Date();
  renderCalendar();
};

closeBtn.onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };
saveBtn.onclick = saveWorkout;
clearBtn.onclick = clearDay;
addExerciseBtn.onclick = () => addCustomExercise();

// Export / Import
document.getElementById('exportBtn').onclick = () => {
  const blob = new Blob([JSON.stringify(workouts, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `entrainements-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
};

document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
document.getElementById('importFile').onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (confirm('Importer et fusionner les données ? (les jours existants seront écrasés)')) {
        Object.assign(workouts, imported);
        localStorage.setItem('workouts', JSON.stringify(workouts));
        renderCalendar();
        alert('Import réussi !');
      }
    } catch {
      alert('Fichier invalide');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

// Init
renderCalendar();
