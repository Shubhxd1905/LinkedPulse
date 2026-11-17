services:
  - type: web
    name: linkedpulse
    runtime: docker
    plan: free
    region: oregon
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /health
    autoDeployTrigger: commit

    envVars:
      - key: ENV
        value: production

      - key: SECRET_KEY
        generateValue: true

      - key: DATABASE_URL
        sync: false

      - key: OPENROUTER_API_KEY
        sync: false

      - key: FRONTEND_URL
        sync: false

      - key: RESEND_API_KEY
        sync: false