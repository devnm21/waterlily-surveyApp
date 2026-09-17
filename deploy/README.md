# Deployment

The Next.js frontend is deployed to the `waterlily-survey-app` Vercel project in
the `devs-projects-502514ba` scope. Its production alias is
`https://waterlily-survey-app-ten.vercel.app`. Set `API_PROXY_ORIGIN` to
`https://pulse.vps.webdock.cloud` in Vercel, then deploy from `frontend/` with
`vercel deploy --prod --scope devs-projects-502514ba`.

The Express API runs on the Pulse VPS as a separate `survey-api` systemd
service. It listens only on `127.0.0.1:3001`; Caddy serves the API over HTTPS
using [`Caddyfile`](./Caddyfile). Pulse services are independent and should not
be restarted to deploy the survey app.

On the VPS, the survey files live under `/home/admin/survey-app/`:

- `node/`: app-specific Node 22 runtime
- `backend/`: compiled API and production dependencies
- `backend/session-secret`: private session signing key; never commit or replace it
- `data/app.db`: persistent SQLite database; never replace it during deployments

To update the API, run `npm run build` in `backend/`, copy `backend/dist/` to
`/home/admin/survey-app/backend/dist/`, and restart only `survey-api`. If
dependencies changed, also copy the backend package files and run `npm ci
--omit=dev` with the app-specific Node binary before restarting. Check
`systemctl status survey-api` after the restart.

This deployment does not yet have an off-server SQLite backup. Configure one
before relying on it for important submissions.
