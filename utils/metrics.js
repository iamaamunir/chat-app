import client from "prom-client";

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // collects CPU, memory, event loop lag, etc.

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "code"],
  buckets: [50, 100, 300, 500, 1000, 2000], // ms
});
