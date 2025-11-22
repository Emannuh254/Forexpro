// -----------------------------
// Load Referral History
// -----------------------------
function loadReferralHistory() {
  const tbody = document.getElementById('referralHistoryBody');
  const noReferrals = document.getElementById('noReferrals');
  const token = localStorage.getItem('token');

  // Show loading state
  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-4 text-center">
        <div class="loading-spinner mx-auto"></div>
      </td>
    </tr>
  `;

  // Fetch referral history from API
  fetch('/api/referral/history', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    tbody.innerHTML = '';

    // No referrals
    if (!data || data.length === 0) {
      noReferrals.style.display = 'block';
      return;
    }

    // Referrals found
    noReferrals.style.display = 'none';

    data.forEach(referral => {
      const row = document.createElement('tr');

      const statusClass =
        referral.bonus_status === 'completed'
          ? 'bg-green-500/20 text-green-400'
          : 'bg-yellow-500/20 text-yellow-400';

      const bonusText =
        referral.bonus_status === 'completed'
          ? `KSH ${referral.bonus_amount}`
          : 'Pending';

      row.innerHTML = `
        <td class="px-6 py-4 whitespace-nowrap text-sm">${new Date(referral.referral_date).toLocaleDateString()}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">${referral.name}</td>
        <td class="px-6 py-4 whitespace-nowrap text-sm">${referral.email}</td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
            ${referral.bonus_status === 'completed' ? 'Completed' : 'Pending'}
          </span>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">${bonusText}</td>
      `;

      tbody.appendChild(row);
    });
  })
  .catch(err => {
    console.error('Error loading referral history:', err);
    tbody.innerHTML = '';
    noReferrals.style.display = 'block';
  });
}


// -----------------------------
// Refresh Button Functionality
// -----------------------------
document.getElementById('refreshBtn').addEventListener('click', function() {
  const icon = this.querySelector('i');
  const token = localStorage.getItem('token');

  icon.classList.add('fa-spin');

  fetch('/api/referral/stats', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    // Update stats
    document.getElementById('totalReferrals').textContent = data.total_referrals;
    document.getElementById('totalBonus').textContent = `KSH ${parseFloat(data.total_bonus).toLocaleString()}`;
    document.getElementById('pendingReferrals').textContent = data.pending_referrals;

    // Update progress bar
    const nextRewardProgress = (data.completed_referrals % 5) * 20;
    document.querySelector('.progress-fill').style.width = `${nextRewardProgress}%`;

    // Reload history
    loadReferralHistory();

    showToast('Referral data refreshed!', 'success');
  })
  .catch(err => {
    console.error('Error refreshing referral data:', err);
    showToast('Failed to refresh data', 'error');
  })
  .finally(() => {
    icon.classList.remove('fa-spin');
  });
});


// -----------------------------
// Load referral stats on page load
// -----------------------------
if (user) {
  const token = localStorage.getItem('token');

  fetch('/api/referral/stats', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  .then(response => response.json())
  .then(data => {
    document.getElementById('totalReferrals').textContent = data.total_referrals;
    document.getElementById('totalBonus').textContent = `KSH ${parseFloat(data.total_bonus).toLocaleString()}`;
    document.getElementById('pendingReferrals').textContent = data.pending_referrals;

    const nextRewardProgress = (data.completed_referrals % 5) * 20;
    document.querySelector('.progress-fill').style.width = `${nextRewardProgress}%`;
  })
  .catch(err => {
    console.error('Error loading referral stats:', err);
  });

  loadReferralHistory();
} else {
  document.getElementById('noReferrals').style.display = 'block';
}
