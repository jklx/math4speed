# Produktion auf einer Compute-Engine-VM

Der Workflow in `.github/workflows/deploy.yml` veröffentlicht bei jedem Merge nach `main` ein unveränderliches Docker-Image und startet es auf der VM. Vor dem Umschalten wird das neue Image als Kandidat auf Port 3001 auf `/api/health` geprüft. Bei einem Fehler läuft die bestehende Version weiter; scheitert der Start nach dem Umschalten, startet das Skript die vorherige Version erneut.

## Einmalig auf der VM

1. Docker und Nginx installieren. Nginx leitet die öffentliche Domain auf `127.0.0.1:3000` weiter. `nginx-math4speed.conf` ist die passende Server-Konfiguration; TLS sollte über Certbot oder einen bestehenden Reverse Proxy eingerichtet werden.
2. Das Datenverzeichnis anlegen. Der Container läuft als Nutzer-ID 1000: `sudo install -d -m 0750 -o 1000 -g 1000 /opt/math4speed/data`.
3. Der Benutzer, mit dem der GitHub-Deploy per OS Login auf die VM kommt, braucht Zugriff auf Docker. Gib nur diesem Benutzer die Docker-Berechtigung; er muss `docker ps` ohne Passwortabfrage ausführen können.
4. Der **an die VM gebundene** Google-Service-Account benötigt `roles/artifactregistry.reader` auf dem Artifact-Registry-Repository, damit Docker Images laden kann.

## Google Cloud und GitHub einrichten

1. Lege ein Docker-Repository in Artifact Registry an, zum Beispiel `math4speed` in deiner VM-Region.
2. Richte für GitHub Actions eine Workload-Identity-Federation ein, eingeschränkt auf `jklx/math4speed`. Verwende keine langfristige JSON-Service-Account-Datei. Die Google-Action empfiehlt diese Authentifizierung ausdrücklich. [Dokumentation](https://github.com/google-github-actions/auth#setting-up-workload-identity-federation)
3. Der Deploy-Service-Account benötigt mindestens Schreibzugriff auf das Artifact-Registry-Repository sowie OS-Login-Zugriff auf **diese** VM. Für IAP zusätzlich `roles/iap.tunnelResourceAccessor`. Aktiviere OS Login auf der VM; Google Cloud verwaltet damit SSH-Zugriff über IAM. [OS Login](https://cloud.google.com/compute/docs/oslogin)
4. Lege in GitHub unter **Settings → Environments → production** diese Variablen an:

   - `GCP_PROJECT_ID`
   - `GCP_REGION` (zum Beispiel `europe-west3`)
   - `GCP_ARTIFACT_REPOSITORY`
   - `GCP_WIF_PROVIDER` (vollständiger Provider-Pfad mit Projektnummer)
   - `GCP_DEPLOY_SERVICE_ACCOUNT`
   - `GCE_INSTANCE`
   - `GCE_ZONE`
   - `GCE_USE_IAP` (`true`, wenn die VM ohne öffentliche SSH-Freigabe erreichbar sein soll)

5. Aktiviere im GitHub-Environment `production` optional eine Freigabe vor dem Deployment. So wird zwar jeder Merge nach `main` gebaut, aber der Live-Schritt braucht deine Bestätigung.

Beim ersten erfolgreichen Deployment stoppt das Skript einen eventuell vorhandenen systemd-Dienst namens `math4speed` erst nach erfolgreichem Container-Check und deaktiviert ihn danach. Schlägt der Containerstart fehl, startet es den bisherigen Dienst wieder.

Nach dem ersten Merge nach `main` ist der Ablauf vollständig automatisch. Ein manueller Start über **Actions → Deploy production → Run workflow** ist ebenfalls möglich.
