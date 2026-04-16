# TMT Helper Hub

Plateforme de collaboration pour l'équipe TMT (Technologie, Médias & Télécoms) de BearingPoint.

Les consultants surchargés peuvent poster des demandes d'aide. Les consultants disponibles proposent leur temps. Un système de gamification récompense les meilleurs helpers.

---

## Stack technique

| Couche       | Technologie                           |
|--------------|---------------------------------------|
| Frontend     | React 18 + Vite + Tailwind CSS        |
| Backend      | Netlify Functions (Node.js 18)        |
| Base de données | Supabase (PostgreSQL)              |
| Emails       | Resend API                            |
| Déploiement  | Netlify                               |

---

## Installation locale

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Variables d'environnement

Créez un fichier `.env.local` à la racine :

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key
```

Et un fichier `.env` pour les Netlify Functions (utilisé en local via `netlify dev`) :

```env
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_ANON_KEY=votre_anon_key
RESEND_API_KEY=re_xxxxxxxxxxxx
ADMIN_EMAIL_FROM=TMT Helper Hub <noreply@votre-domaine.fr>
URL=http://localhost:5173
```

> **Note :** Le fichier `.env` est également celui lu par Netlify en production (à configurer dans l'interface Netlify).

### 3. Lancer en développement

Avec [Netlify CLI](https://docs.netlify.com/cli/get-started/) (recommandé — émule les Functions) :

```bash
npm install -g netlify-cli
netlify dev
```

Ou simplement le frontend seul :

```bash
npm run dev
```

---

## Base de données Supabase

### Création des tables

Exécutez ce SQL dans l'éditeur SQL de votre projet Supabase :

```sql
-- ────────────────────────────────────────────────────────────────
-- 1. Consultants
-- ────────────────────────────────────────────────────────────────
CREATE TABLE consultants (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom           VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  grade         VARCHAR(50)  NOT NULL
                  CHECK (grade IN ('Analyste','Consultant','Consultant Senior','Manager','Partner')),
  is_admin      BOOLEAN DEFAULT FALSE,
  statut        VARCHAR(20)  DEFAULT 'actif'
                  CHECK (statut IN ('actif','inactif')),
  total_points  INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 2. Demandes d'aide
-- ────────────────────────────────────────────────────────────────
CREATE TABLE demandes (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demandeur_id          UUID REFERENCES consultants(id),
  titre                 VARCHAR(500) NOT NULL,
  categorie             VARCHAR(100) NOT NULL,
  description           TEXT DEFAULT '',
  heures_estimees       INTEGER CHECK (heures_estimees BETWEEN 1 AND 8),
  statut                VARCHAR(20)  DEFAULT 'ouverte'
                          CHECK (statut IN ('ouverte','en_cours','completee')),
  assigne_a             UUID REFERENCES consultants(id),
  consultants_notifies  UUID[] DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

-- ────────────────────────────────────────────────────────────────
-- 3. Disponibilités
-- ────────────────────────────────────────────────────────────────
CREATE TABLE disponibilites (
  id                          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consultant_id               UUID REFERENCES consultants(id),
  heures_disponibles_par_semaine INTEGER DEFAULT 0,
  note                        TEXT DEFAULT '',
  est_active                  BOOLEAN DEFAULT TRUE,
  created_at                  TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────
-- 4. Assignations (ne jamais supprimer)
-- ────────────────────────────────────────────────────────────────
CREATE TABLE assignations (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  demande_id       UUID REFERENCES demandes(id),
  helper_id        UUID REFERENCES consultants(id),
  heures_creditees INTEGER NOT NULL,
  completed_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### Politique RLS (Row Level Security)

Pour une utilisation simplifiée (pas d'authentification), désactivez RLS sur toutes les tables ou ajoutez une politique "tout public" :

```sql
-- Option A : désactiver RLS (plus simple pour un outil interne)
ALTER TABLE consultants    DISABLE ROW LEVEL SECURITY;
ALTER TABLE demandes       DISABLE ROW LEVEL SECURITY;
ALTER TABLE disponibilites DISABLE ROW LEVEL SECURITY;
ALTER TABLE assignations   DISABLE ROW LEVEL SECURITY;

-- Option B : politique publique read/write
ALTER TABLE consultants    ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON consultants    FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE demandes       ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON demandes       FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE disponibilites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON disponibilites FOR ALL USING (true) WITH CHECK (true);
ALTER TABLE assignations   ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public access" ON assignations   FOR ALL USING (true) WITH CHECK (true);
```

### Données de test (seed)

```sql
-- Consultants exemples
INSERT INTO consultants (nom, email, grade, is_admin, total_points) VALUES
  ('Sophie Martin',    'sophie.martin@bearingpoint.com',    'Manager',            TRUE,  42),
  ('Lucas Bernard',    'lucas.bernard@bearingpoint.com',    'Consultant Senior',  TRUE,  28),
  ('Emma Dupont',      'emma.dupont@bearingpoint.com',      'Consultant',         FALSE, 15),
  ('Thomas Leclerc',   'thomas.leclerc@bearingpoint.com',   'Consultant Senior',  FALSE, 9),
  ('Camille Rousseau', 'camille.rousseau@bearingpoint.com', 'Analyste',           FALSE, 3),
  ('Julien Moreau',    'julien.moreau@bearingpoint.com',    'Partner',            TRUE,  0);

-- Demandes exemples
INSERT INTO demandes (demandeur_id, titre, categorie, description, heures_estimees, statut)
SELECT
  (SELECT id FROM consultants WHERE nom = 'Emma Dupont'),
  'Préparation slides comité de direction Telecom',
  'Slides / Présentation',
  'Besoin de 8 slides résumant les tendances du marché télécom pour le CODIR du 25 avril.',
  4, 'ouverte';

INSERT INTO demandes (demandeur_id, titre, categorie, description, heures_estimees, statut)
SELECT
  (SELECT id FROM consultants WHERE nom = 'Thomas Leclerc'),
  'Benchmark des offres cloud hyperscalers (AWS / Azure / GCP)',
  'Recherche & Benchmark',
  'Comparatif des offres pour un client retail — focus pricing et SLA.',
  6, 'ouverte';

INSERT INTO demandes (demandeur_id, titre, categorie, description, heures_estimees, statut,
                      assigne_a, completed_at)
SELECT
  (SELECT id FROM consultants WHERE nom = 'Julien Moreau'),
  'Analyse financière d''une acquisition media',
  'Analyse de données',
  'Modèle Excel + narrative pour une cible dans le secteur médias numériques.',
  8, 'completee',
  (SELECT id FROM consultants WHERE nom = 'Sophie Martin'),
  NOW() - INTERVAL '3 days';

-- Disponibilité exemple
INSERT INTO disponibilites (consultant_id, heures_disponibles_par_semaine, note)
SELECT id, 3, 'Disponible le mardi et jeudi matin.'
FROM consultants WHERE nom = 'Lucas Bernard';

INSERT INTO disponibilites (consultant_id, heures_disponibles_par_semaine, note)
SELECT id, 5, 'Libre cette semaine — projet terminé !'
FROM consultants WHERE nom = 'Thomas Leclerc';

-- Assignation exemple (pour les points)
INSERT INTO assignations (demande_id, helper_id, heures_creditees, completed_at)
SELECT
  (SELECT id FROM demandes WHERE titre LIKE '%acquisition media%'),
  (SELECT id FROM consultants WHERE nom = 'Sophie Martin'),
  8,
  NOW() - INTERVAL '3 days';
```

---

## Configuration Resend

1. Créez un compte sur [resend.com](https://resend.com)
2. Vérifiez votre domaine (ex: `bearingpoint.com`)
3. Générez une clé API dans *API Keys*
4. Configurez la variable `RESEND_API_KEY` et `ADMIN_EMAIL_FROM`

> **Sans clé Resend :** L'application fonctionne normalement, les emails sont simplement ignorés (message de warning dans les logs des Functions).

---

## Déploiement sur Netlify

### Option A — Interface Netlify (recommandée)

1. Poussez le code sur GitHub / GitLab
2. Créez un nouveau site sur [app.netlify.com](https://app.netlify.com)
3. Connectez votre dépôt
4. Les paramètres de build sont dans `netlify.toml` (aucune config manuelle nécessaire)
5. Ajoutez les variables d'environnement dans **Site settings → Environment variables** :
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL_FROM`

### Option B — CLI

```bash
netlify login
netlify init
netlify env:set SUPABASE_URL "https://..."
netlify env:set SUPABASE_ANON_KEY "..."
netlify env:set RESEND_API_KEY "re_..."
netlify env:set ADMIN_EMAIL_FROM "TMT Helper Hub <noreply@..."
netlify deploy --prod
```

---

## Architecture des fonctions Netlify

| Endpoint              | Méthodes       | Description                                      |
|-----------------------|----------------|--------------------------------------------------|
| `/api/consultants`    | GET, POST, PUT, DELETE | CRUD consultants (soft delete)         |
| `/api/demandes`       | GET, POST, PUT | CRUD demandes + envoi emails                     |
| `/api/disponibilites` | GET, POST, PUT | Gestion des disponibilités                       |
| `/api/assignations`   | GET            | Lecture des assignations (classement mensuel)    |

### Paramètres spéciaux pour PUT `/api/demandes`

| `?action=`  | Description                                           |
|-------------|-------------------------------------------------------|
| `accept`    | Le helper courant accepte la demande → email demandeur |
| `assign`    | Admin assigne un helper → email demandeur             |
| `complete`  | Marquer complétée → créditer points + créer assignation |

---

## Système de gamification

| Points     | Niveau           |
|------------|------------------|
| 0–9 pts    | 🤝 Coéquipier    |
| 10–24 pts  | 💚 Petit Helper  |
| 25–49 pts  | 💙 Bon Helper    |
| 50–99 pts  | 💜 Expert Helper |
| 100+ pts   | 🏆 MVP Helper    |

**Règle :** 1 heure créditée = 1 point. Les points sont cumulatifs (total_points sur le profil).

---

## Structure du projet

```
TMTHelperHub/
├── netlify.toml                 # Config déploiement Netlify
├── package.json
├── vite.config.js
├── tailwind.config.js
├── index.html
├── src/
│   ├── App.jsx                  # Routes principales
│   ├── main.jsx
│   ├── index.css                # Styles globaux Tailwind
│   ├── lib/
│   │   ├── supabase.js          # Client Supabase (lecture directe)
│   │   └── api.js               # Appels aux Netlify Functions
│   ├── contexts/
│   │   └── ToastContext.jsx     # Notifications toast
│   ├── components/
│   │   ├── Layout.jsx           # Navigation + sélecteur d'identité
│   │   ├── Modal.jsx            # Composant modal réutilisable
│   │   └── LoadingSpinner.jsx   # Loaders et états vides
│   └── pages/
│       ├── Dashboard.jsx        # Vue d'ensemble + actions rapides
│       ├── Demandes.jsx         # Tableau des demandes
│       ├── Classement.jsx       # Leaderboard gamification
│       └── Admin.jsx            # Gestion de l'équipe
└── netlify/
    └── functions/
        ├── consultants.js
        ├── demandes.js          # + logique email intégrée
        ├── disponibilites.js
        ├── assignations.js
        └── utils/
            ├── supabaseClient.js
            ├── cors.js
            └── email.js         # Templates HTML emails
```
