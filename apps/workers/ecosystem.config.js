module.exports = {
  apps: [
    {
      name: "qc-worker",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/worker-error.log",
      out_file: "./logs/worker-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
