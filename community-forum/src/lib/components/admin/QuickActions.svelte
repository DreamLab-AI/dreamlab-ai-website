<script lang="ts">
  import { base } from '$app/paths';
</script>

<div class="card bg-base-200 mb-6">
  <div class="card-body">
    <h2 class="card-title mb-4">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      Quick Actions
    </h2>

    <div class="grid gap-4 grid-cols-1 md:grid-cols-2">
      <a href="{base}/admin/stats" class="card bg-base-300 hover:bg-base-100 transition-colors cursor-pointer border border-base-content/10 hover:border-primary/30">
        <div class="card-body flex-row items-center gap-4">
          <div class="rounded-lg bg-primary/10 p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold">Stats Dashboard</h3>
            <p class="text-sm text-base-content/70">View detailed system analytics, user activity trends, and usage reports</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/40 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>

      <a href="{base}/admin/calendar" class="card bg-base-300 hover:bg-base-100 transition-colors cursor-pointer border border-base-content/10 hover:border-secondary/30">
        <div class="card-body flex-row items-center gap-4">
          <div class="rounded-lg bg-secondary/10 p-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 class="font-semibold">Calendar Management</h3>
            <p class="text-sm text-base-content/70">Manage calendar events, scheduling, and community event coordination</p>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-base-content/40 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </a>
    </div>
  </div>
</div>
