import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Clean up old live updates every hour
crons.interval(
  "cleanup live updates",
  { minutes: 60 }, // Every hour
  internal.liveUpdates.cleanup,
);

// Clean up old connections every 6 hours
crons.interval(
  "cleanup connections", 
  { hours: 6 }, // Every 6 hours
  internal.connections.cleanupConnections,
);

export default crons;