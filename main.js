import {
  loginWithEmailPassword,
  signupWithEmailPassword,
  loginWithGoogle,
  signupWithGoogle,
  logout,
  subscribeAuthState
} from './auth.js';
import { db, loadDataFirebase, syncData, upsertRecord } from './data.js';
import {
  bindRoleButtons,
  closeAuth,
  getAuthViewState,
  guardRouteOrPromptAuth,
  openAuth,
  populateSignupPlayers,
  setAuthenticatedUI,
  toggleSignUp
} from './ui.js';
import { generateId, showLoader, showToast } from './utils.js';

function seedIfEmpty() {
  if (!Object.keys(db.teams).length) {
    const teamA = generateId('team');
    const teamB = generateId('team');
    upsertRecord('teams', teamA, { id: teamA, name: 'Falcons U16', sport: 'Basketball' });
    upsertRecord('teams', teamB, { id: teamB, name: 'Lions U18', sport: 'Soccer' });

    const playerA = generateId('player');
    const playerB = generateId('player');
    upsertRecord('players', playerA, { id: playerA, name: 'Jordan Hill', teamId: teamA });
    upsertRecord('players', playerB, { id: playerB, name: 'Avery Lane', teamId: teamB });

    const matchA = generateId('match');
    upsertRecord('matches', matchA, {
      id: matchA,
      homeTeam: 'Falcons U16',
      awayTeam: 'Hawks U16',
      score: '63 - 58',
      playedAt: new Date().toISOString()
    });
  }
}

function renderDashboard() {
  const teamList = document.getElementById('teamList');
  const matchList = document.getElementById('matchList');

  const teams = Object.values(db.teams);
  teamList.innerHTML = teams.length
    ? teams.map((team) => `<li class="rounded-lg bg-slate-100 px-3 py-2">${team.name} • ${team.sport}</li>`).join('')
    : '<li class="text-slate-500">No teams yet.</li>';

  const matches = Object.values(db.matches)
    .sort((a, b) => new Date(b.playedAt || 0).getTime() - new Date(a.playedAt || 0).getTime())
    .slice(0, 5);

  matchList.innerHTML = matches.length
    ? matches
        .map((match) => `<li class="rounded-lg bg-slate-100 px-3 py-2">${match.homeTeam} vs ${match.awayTeam} <strong>${match.score}</strong></li>`)
        .join('')
    : '<li class="text-slate-500">No matches yet.</li>';
}

function registerListeners() {
  document.getElementById('openAuthBtn').addEventListener('click', openAuth);
  document.getElementById('closeAuthBtn').addEventListener('click', closeAuth);
  document.getElementById('toggleAuthModeBtn').addEventListener('click', () => toggleSignUp());
  document.getElementById('logoutBtn').addEventListener('click', logout);
  bindRoleButtons();

  document.getElementById('authForm').addEventListener('submit', async (event) => {
    event.preventDefault();

    const { isSignupMode, selectedRole } = getAuthViewState();
    const email = document.getElementById('emailInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();
    const name = document.getElementById('nameInput').value.trim();
    const teamId = document.getElementById('teamSelect').value;
    const playerId = document.getElementById('playerSelect').value;
    const sport = document.getElementById('sportInput').value.trim();

    showLoader(650);
    try {
      if (isSignupMode) {
        await signupWithEmailPassword({ email, password, name, role: selectedRole, teamId, playerId, sport });
      } else {
        await loginWithEmailPassword(email, password);
      }
      closeAuth();
    } catch (error) {
      // handled in auth module
    }
  });

  document.getElementById('googleBtn').addEventListener('click', async () => {
    const { isSignupMode, selectedRole } = getAuthViewState();
    const teamId = document.getElementById('teamSelect').value;
    const playerId = document.getElementById('playerSelect').value;
    const sport = document.getElementById('sportInput').value.trim();
    showLoader(650);

    try {
      if (isSignupMode) {
        await signupWithGoogle(selectedRole, { teamId, playerId, sport });
      } else {
        await loginWithGoogle(selectedRole);
      }
      closeAuth();
    } catch (error) {
      // handled in auth module
    }
  });

  document.querySelectorAll('.feature-card').forEach((card) => {
    card.addEventListener('click', () => {
      const action = card.dataset.cardAction;
      guardRouteOrPromptAuth(action);
    });
  });

  document.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const section = btn.dataset.section;
      if (section === 'landing') {
        showToast('Viewing overview.', 'info');
      } else {
        guardRouteOrPromptAuth(section);
      }
    });
  });
}

async function initApp() {
  showLoader(800);
  try {
    await loadDataFirebase();
    seedIfEmpty();
    populateSignupPlayers();
    renderDashboard();

    syncData(() => {
      populateSignupPlayers();
      renderDashboard();
    });

    subscribeAuthState((user) => {
      setAuthenticatedUI(user);
      renderDashboard();
    });
  } catch (error) {
    showToast(error.message || 'Unable to initialize app.', 'error');
  }

  registerListeners();
}

document.addEventListener('DOMContentLoaded', initApp);
