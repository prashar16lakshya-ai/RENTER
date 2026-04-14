import { db } from './data.js';
import { getCurrentUser } from './auth.js';
import { showToast } from './utils.js';

let isSignupMode = false;
let selectedRole = 'student';

export function getAuthViewState() {
  return { isSignupMode, selectedRole };
}

export function setSelectedRole(role) {
  selectedRole = role;
  document.querySelectorAll('.role-btn').forEach((btn) => {
    const active = btn.dataset.role === role;
    btn.classList.toggle('bg-primary/10', active);
    btn.classList.toggle('border-primary', active);
    btn.classList.toggle('text-primary', active);
  });

  const playerWrap = document.getElementById('playerSelectWrap');
  if (playerWrap) {
    playerWrap.classList.toggle('hidden', selectedRole !== 'student');
  }
}

export function toggleSignUp(force) {
  isSignupMode = typeof force === 'boolean' ? force : !isSignupMode;
  const title = document.getElementById('authTitle');
  const text = document.getElementById('authToggleText');
  const cta = document.getElementById('toggleAuthModeBtn');
  const submit = document.getElementById('emailSubmitBtn');
  const dynamic = document.getElementById('signupDynamicFields');
  const nameInput = document.getElementById('nameInput');

  title.textContent = isSignupMode ? 'Create Account' : 'Login';
  text.textContent = isSignupMode ? 'Already have an account?' : "Don't have an account?";
  cta.textContent = isSignupMode ? 'Login' : 'Sign Up';
  submit.textContent = isSignupMode ? 'Create Account' : 'Continue';
  dynamic.classList.toggle('hidden', !isSignupMode);
  nameInput.parentElement.classList.toggle('hidden', !isSignupMode);

  if (isSignupMode) populateSignupPlayers();
}

export function openAuth() {
  const modal = document.getElementById('authModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

export function closeAuth() {
  const modal = document.getElementById('authModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

export function populateSignupPlayers() {
  const teamSelect = document.getElementById('teamSelect');
  const playerSelect = document.getElementById('playerSelect');
  if (!teamSelect || !playerSelect) return;

  const teams = Object.values(db.teams);
  const players = Object.values(db.players);

  if (!teams.length) {
    teamSelect.innerHTML = '<option value="">No teams available</option>';
    playerSelect.innerHTML = '<option value="">No players available</option>';
    return;
  }

  teamSelect.innerHTML = teams
    .map((team) => `<option value="${team.id}">${team.name} (${team.sport || 'N/A'})</option>`)
    .join('');

  const selectedTeamId = teamSelect.value || teams[0].id;
  const filteredPlayers = players.filter((player) => player.teamId === selectedTeamId);
  playerSelect.innerHTML = filteredPlayers.length
    ? filteredPlayers.map((player) => `<option value="${player.id}">${player.name}</option>`).join('')
    : '<option value="">No players for selected team</option>';

  teamSelect.onchange = () => populateSignupPlayers();
}

export function guardRouteOrPromptAuth(sectionName) {
  if (!getCurrentUser()) {
    showToast(`Please login to access ${sectionName}.`, 'warning');
    openAuth();
    return false;
  }
  return true;
}

export function bindRoleButtons() {
  document.querySelectorAll('.role-btn').forEach((btn) => {
    btn.addEventListener('click', () => setSelectedRole(btn.dataset.role));
  });
}

export function setAuthenticatedUI(user) {
  document.getElementById('openAuthBtn').classList.toggle('hidden', !!user);
  document.getElementById('logoutBtn').classList.toggle('hidden', !user);
  document.getElementById('sidebar').classList.toggle('hidden', !user);
  document.getElementById('landingSection').classList.toggle('hidden', !!user);
  document.getElementById('dashboardSection').classList.toggle('hidden', !user);
  document.getElementById('roleBadge').textContent = user ? selectedRole : 'Guest';
}
