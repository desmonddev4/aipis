# AIPIS 2027 website

- `frontend/` multi-page static site (one HTML file per page with its own embedded CSS, shared `js/main.js`), deployed on Vercel
- `backend/` Django API that stores form submissions and emails the secretariat, deployed on Render
- `render.yaml` Render blueprint (web service plus Postgres)

## Run locally

Backend:

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then export its values, e.g. `set -a; source .env; set +a`
python manage.py migrate
python manage.py createsuperuser   # for /admin/
python manage.py runserver 8000
```

Frontend (any static server):

```bash
cd frontend
python -m http.server 3000
```

On localhost the frontend calls `http://localhost:8000`.

## Deploy the backend (Render)

1. Push the repo to GitHub, then in Render choose New > Blueprint and select it. `render.yaml` creates the web service and database.
2. Set `CORS_ALLOWED_ORIGINS` to the Vercel URL (no trailing slash), e.g. `https://aipis.vercel.app`. Add several origins separated by commas.
3. Set `EMAIL_HOST`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD` to send notification emails to `NOTIFY_EMAIL`. Without them, emails print to the log; submissions are still saved.
4. To create an admin user, set `DJANGO_SUPERUSER_USERNAME` and `DJANGO_SUPERUSER_PASSWORD` before the first deploy.
5. Submissions are viewable at `https://<service>.onrender.com/admin/`.

## Deploy the frontend (Vercel)

1. Import the repo in Vercel and set Root Directory to `frontend` (framework preset: Other, no build command).
2. Edit `frontend/js/config.js` and set the production `API_URL` to the Render service URL.

## Frontend file map

- `frontend/*.html` one page each, with its own embedded page-specific CSS
- `frontend/js/components/navbar.js` navbar (links, styles, menu behaviour)
- `frontend/js/components/footer.js` footer
- `frontend/js/components/form-modal.js` pop-up forms (field definitions and styles)
- `frontend/js/components/contact-form.js` contact page form
- `frontend/js/components/scroll-effects.js` progress bar, back-to-top, scroll animations
- `frontend/js/lib/form-api.js` form validation and API call
- `frontend/js/config.js` API URL

## Notes

- The brochure is served from `frontend/assets/AIPIS_2027_Brochure.pdf`.
- Dates follow the concept note and website content (24 to 27 August 2027). The cover of `AIPIS_Website_Content.docx` says 8 to 11 June 2027, which conflicts with the rest of the documents.
