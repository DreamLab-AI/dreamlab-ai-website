<script lang="ts">
  export let stats: {
    totalUsers: number;
    totalChannels: number;
    totalMessages: number;
    pendingApprovals: number;
  };
</script>

<div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
  <!-- Total Users -->
  <div class="card bg-primary/10">
    <div class="card-body items-center text-center gap-3">
      <div class="text-primary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div class="stat-value text-primary">{stats.totalUsers}</div>
      <div class="text-sm text-base-content/70 uppercase tracking-wide">Total Users</div>
    </div>
  </div>

  <!-- Total Channels -->
  <div class="card bg-secondary/10">
    <div class="card-body items-center text-center gap-3">
      <div class="text-secondary">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
        </svg>
      </div>
      <div class="stat-value text-secondary">{stats.totalChannels}</div>
      <div class="text-sm text-base-content/70 uppercase tracking-wide">Total Channels</div>
    </div>
  </div>

  <!-- Total Messages -->
  <div class="card bg-accent/10">
    <div class="card-body items-center text-center gap-3">
      <div class="text-accent">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </div>
      <div class="stat-value text-accent">{stats.totalMessages}</div>
      <div class="text-sm text-base-content/70 uppercase tracking-wide">Total Messages</div>
    </div>
  </div>

  <!-- Pending Approvals -->
  <div class="card bg-warning/10 {stats.pendingApprovals > 0 ? 'border-2 border-warning' : ''}">
    <div class="card-body items-center text-center gap-3">
      <div class="text-warning">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="stat-value text-warning">{stats.pendingApprovals}</div>
      <div class="text-sm text-base-content/70 uppercase tracking-wide">Pending Approvals</div>
    </div>
  </div>
</div>
