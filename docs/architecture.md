# Veloadout — Architecture

---

## System context

```mermaid
graph TD
    User(["👤 User<br>browser"])
    Vercel["⬡ Vercel<br>Next.js 15"]
    Supabase["🐘 Supabase<br>Postgres + Auth"]
    Anthropic["🤖 Anthropic<br>Claude Haiku"]
    Web["🌐 Web<br>search results"]

    User -->|HTTPS| Vercel
    Vercel -->|REST API| Supabase
    Vercel -->|API calls| Anthropic
    Anthropic -->|web_search| Web

    style User fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style Vercel fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style Supabase fill:#d1fae5,stroke:#059669,color:#064e3b
    style Anthropic fill:#fef3c7,stroke:#d97706,color:#451a03
    style Web fill:#f3f4f6,stroke:#6b7280,color:#111827
```

---

## Clean Architecture layers

```mermaid
graph TD
    P["🖥️ Presentation<br>React components<br>SearchBar · GearList · AuthButton"]
    A["⚙️ Application<br>Use Cases<br>LookupOrSearchGearItem<br>GetPresets"]
    D["🏛️ Domain<br>GearItem · GearVariant<br>BagRecommendation · GearPreset<br>IGearItemRepository · IGearSearchService"]
    I["🔌 Infrastructure<br>SupabaseGearItemRepository<br>ClaudeGearSearchService<br>SupabaseGearListRepository<br>RateLimit"]

    P -->|calls| A
    A -->|uses interfaces| D
    I -->|implements| D

    style P fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style A fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style D fill:#d1fae5,stroke:#059669,color:#064e3b
    style I fill:#fce7f3,stroke:#db2777,color:#500724
```

> Arrows point inward: Domain depends on nothing. Infrastructure depends on Domain, never the other way around.

---

## Folder structure

```
src/
├── domain/
│   └── gear/
│       ├── GearItem.ts           ← aggregate root
│       ├── GearVariant.ts        ← value object
│       ├── GearCategory.ts       ← enum
│       ├── GearCategoryIcon.ts   ← emoji map
│       ├── GearPreset.ts         ← preset type
│       ├── BagRecommendation.ts  ← pure function
│       ├── IGearItemRepository.ts
│       ├── IGearSearchService.ts
│       └── __tests__/
│   └── list/
│       └── GearListItem.ts
│
├── application/
│   └── gear/
│       ├── LookupOrSearchGearItemUseCase.ts
│       └── GetPresetsUseCase.ts
│
├── infrastructure/
│   ├── supabase/
│   │   ├── client.ts                    ← browser client
│   │   ├── server.ts                    ← SSR client (cookies)
│   │   ├── SupabaseGearItemRepository.ts
│   │   ├── SupabaseGearListRepository.ts
│   │   ├── schema.sql
│   │   └── seed.sql
│   ├── ai/
│   │   └── ClaudeGearSearchService.ts
│   └── security/
│       └── rateLimit.ts
│
├── presentation/
│   └── components/
│       ├── GearCalculator.tsx    ← root component
│       ├── SearchBar.tsx
│       ├── GearList.tsx
│       ├── PresetPanel.tsx
│       ├── BagRecommendationPanel.tsx
│       ├── AuthButton.tsx
│       ├── LanguageSwitcher.tsx
│       ├── Toast.tsx
│       ├── CookieBanner.tsx
│       └── LegalLayout.tsx
│
├── app/                          ← Next.js App Router
│   ├── layout.tsx                ← passthrough root layout
│   ├── [locale]/
│   │   ├── layout.tsx            ← html/body, providers, SEO
│   │   ├── page.tsx              ← reads Supabase user → GearCalculator
│   │   ├── auth/callback/
│   │   ├── privacy/
│   │   ├── terms/
│   │   └── impressum/
│   └── api/
│       ├── lookup/route.ts       ← GET (search) + POST (save)
│       ├── lists/route.ts        ← GET/POST/DELETE
│       ├── auth/route.ts         ← POST (magic link)
│       └── presets/route.ts
│
└── i18n/
    ├── routing.ts
    ├── request.ts
    └── messages/
        ├── en.json
        ├── de.json
        └── ru.json
```

---

## Gear search flow

```mermaid
sequenceDiagram
    participant B as 🌐 Browser
    participant API as ⚡ /api/lookup
    participant Repo as 🗄️ GearItemRepo
    participant DB as 🐘 Supabase DB
    participant AI as 🤖 ClaudeSearch
    participant LLM as ✨ Claude Haiku

    rect rgb(224, 242, 254)
        Note over B,DB: Stage 1 — fast DB lookup
        B->>API: GET ?q=MSR Hubba&db_only=1
        API->>Repo: findByQuery()
        Repo->>DB: SELECT WHERE search_text ILIKE '%msr hubba%'
        DB-->>Repo: [] not found
        Repo-->>API: null
        API-->>B: {status: "not_found"}
    end

    rect rgb(224, 231, 255)
        Note over B,LLM: Stage 2 — AI search
        B->>API: GET ?q=MSR Hubba
        API->>Repo: findByQuery()
        Repo->>DB: ILIKE query
        DB-->>Repo: [] not found
        API->>AI: search("MSR Hubba")
        AI->>LLM: system prompt + user query
        LLM-->>AI: tool_use: web_search
        AI->>LLM: tool_result (web content)
        LLM-->>AI: JSON with variants
        AI-->>API: GearSearchResult
        API-->>B: {status:"found_ai", item, variants}
    end

    rect rgb(254, 243, 199)
        Note over B,LLM: Stage 3 — optional "dig deeper" retry (≤2×)
        Note over B: User clicks button on ConfirmCard
        B->>API: GET ?q=MSR Hubba&depth=2
        Note over API,LLM: Skips DB cache; max_uses=6,<br>max_turns=8, stricter prompt
        API->>AI: search("MSR Hubba", depth=2)
        AI->>LLM: enumerate-all-sizes prompt
        LLM-->>AI: JSON with more variants
        AI-->>API: GearSearchResult
        API-->>B: {status:"found_ai", item, variants}
        Note over B: original id preserved →<br>upsert updates same row
    end

    rect rgb(209, 250, 229)
        Note over B,DB: Stage 4 — user confirms & saves
        B->>API: POST {item: {...}}
        API->>Repo: save(GearItem)
        Repo->>DB: UPSERT gear_items
        DB-->>Repo: ok
        API-->>B: {ok: true}
    end
```

---

## Auth flow

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant App as 🚴 Veloadout
    participant API as ⚡ /api/auth
    participant SB as 🔐 Supabase Auth
    participant Email as 📧 Email inbox

    rect rgb(254, 243, 199)
        Note over U,SB: Request magic link
        U->>App: clicks Sign in
        U->>App: enters email
        App->>API: POST {email, locale}
        API->>SB: signInWithOtp(email)
        SB->>Email: magic link → /[locale]/auth/callback
        API-->>App: {ok: true}
        App-->>U: "Check your email"
    end

    rect rgb(209, 250, 229)
        Note over U,SB: Verify and establish session
        U->>Email: opens link
        Email->>App: GET /[locale]/auth/callback?code=xxx
        App->>SB: exchangeCodeForSession(code)
        SB-->>App: session cookie
        App-->>U: redirect → /[locale]
        Note over App,SB: Middleware refreshes<br>session on every request
    end
```

---

## Data model

```mermaid
erDiagram
    GEAR_ITEMS {
        text id PK
        jsonb names_json
        jsonb aliases_json
        numeric volume_liters
        numeric weight_grams
        text category
        text source_url
        jsonb variants_json
        text search_text
        timestamptz created_at
    }

    AUTH_USERS {
        uuid id PK
        text email
    }

    GEAR_LISTS {
        uuid id PK
        uuid user_id FK
        text name
        timestamptz updated_at
    }

    GEAR_LIST_ITEMS {
        uuid id PK
        uuid list_id FK
        text name
        text category
        numeric volume_liters
        numeric weight_grams
        int quantity
        text size_label
        text source
    }

    AUTH_USERS ||--o{ GEAR_LISTS : owns
    GEAR_LISTS ||--o{ GEAR_LIST_ITEMS : contains
```

---

## Supabase RLS policies

```mermaid
graph LR
    subgraph gear_items["🌍 gear_items — shared catalog"]
        GI_R["SELECT<br>anyone"]
        GI_I["INSERT<br>anyone"]
        GI_U["UPDATE<br>anyone"]
    end

    subgraph gear_lists["🔒 gear_lists — user data"]
        GL_ALL["ALL ops<br>own rows only<br>auth.uid() = user_id"]
    end

    subgraph gear_list_items["🔒 gear_list_items — user data"]
        GLI_ALL["ALL ops<br>via own lists only"]
    end

    style GI_R fill:#d1fae5,stroke:#059669,color:#064e3b
    style GI_I fill:#d1fae5,stroke:#059669,color:#064e3b
    style GI_U fill:#d1fae5,stroke:#059669,color:#064e3b
    style GL_ALL fill:#fef3c7,stroke:#d97706,color:#451a03
    style GLI_ALL fill:#fef3c7,stroke:#d97706,color:#451a03
```

---

## Supabase client usage

```mermaid
graph TD
    SC["🍪 server.ts<br>createServerSupabaseClient<br>reads auth cookies"]
    BC["🌐 client.ts<br>createBrowserClient<br>browser-side auth"]

    SC -->|auth check| PG["app/locale/page.tsx"]
    SC -->|session refresh| MW["middleware.ts"]
    SC -->|read user lists| LR["GET /api/lists"]
    SC -->|save user lists| LS["POST /api/lists"]
    SC -->|gear search| GS["GET /api/lookup"]
    SC -->|save gear catalog| GW["POST /api/lookup"]
    BC -->|sign out| AB["AuthButton.tsx"]

    style SC fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style BC fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style PG fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style MW fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style LR fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style LS fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style GS fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style GW fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style AB fill:#f3f4f6,stroke:#9ca3af,color:#111827
```

---

## API routes

```mermaid
graph LR
    subgraph Public["🟢 Public — no auth required"]
        L1["GET /api/lookup?db_only=1<br>fast DB search"]
        L2["GET /api/lookup&depth=1..3<br>DB → AI fallback;<br>depth≥2 skips DB cache"]
        L3["POST /api/lookup<br>save confirmed item"]
        P["GET /api/presets<br>static presets list"]
    end

    subgraph Auth["🔐 Auth — Supabase session required"]
        A1["POST /api/auth<br>send magic link"]
        A2["DELETE /api/auth<br>sign out"]
        LS1["GET /api/lists<br>load user list"]
        LS2["POST /api/lists<br>save user list"]
        LS3["DELETE /api/lists<br>GDPR delete"]
    end

    style L1 fill:#d1fae5,stroke:#059669,color:#064e3b
    style L2 fill:#d1fae5,stroke:#059669,color:#064e3b
    style L3 fill:#d1fae5,stroke:#059669,color:#064e3b
    style P fill:#d1fae5,stroke:#059669,color:#064e3b
    style A1 fill:#fef3c7,stroke:#d97706,color:#451a03
    style A2 fill:#fce7f3,stroke:#db2777,color:#500724
    style LS1 fill:#fef3c7,stroke:#d97706,color:#451a03
    style LS2 fill:#fef3c7,stroke:#d97706,color:#451a03
    style LS3 fill:#fce7f3,stroke:#db2777,color:#500724
```

---

## Rate limiting

```mermaid
graph TD
    R["📨 Request"]
    RL["🛡️ checkRateLimit<br>in-memory Map<br>key → count + resetAt"]
    OK["✅ Pass through"]
    BLOCK["🚫 429 Too Many Requests"]

    R --> RL
    RL -->|allowed| OK
    RL -->|exceeded| BLOCK

    L1["🤖 AI lookup<br>20 req / IP / hour"]
    L2["📧 Magic link by IP<br>5 req / IP / 10 min"]
    L3["✉️ Magic link by email<br>3 req / email / 10 min"]

    style R fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style RL fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style OK fill:#d1fae5,stroke:#059669,color:#064e3b
    style BLOCK fill:#fce7f3,stroke:#db2777,color:#500724
    style L1 fill:#fef3c7,stroke:#d97706,color:#451a03
    style L2 fill:#fef3c7,stroke:#d97706,color:#451a03
    style L3 fill:#fef3c7,stroke:#d97706,color:#451a03
```

---

## i18n routing

```mermaid
graph LR
    REQ["📨 request /"]
    MW["⚙️ middleware.ts<br>next-intl + Supabase session"]
    EN["🇬🇧 /en"]
    DE["🇩🇪 /de"]
    RU["🇷🇺 /ru"]
    MSG["📝 messages/<br>en.json · de.json · ru.json"]

    REQ -->|detect locale| MW
    MW --> EN
    MW --> DE
    MW --> RU
    EN & DE & RU -->|getMessages| MSG

    style REQ fill:#f3f4f6,stroke:#9ca3af,color:#111827
    style MW fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style EN fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style DE fill:#d1fae5,stroke:#059669,color:#064e3b
    style RU fill:#fce7f3,stroke:#db2777,color:#500724
    style MSG fill:#fef3c7,stroke:#d97706,color:#451a03
```

---

## Frontend component tree

```mermaid
graph TD
    LL["🌐 LocaleLayout<br>html · body · providers"]
    TC["🔔 ToastProvider"]
    CB["🍪 CookieBanner"]
    GC["⚙️ GearCalculator<br>state: entries · listId · saving"]

    SB["🔍 SearchBar<br>two-stage search · ConfirmCard"]
    PP["⚡ PresetPanel<br>toggle presets"]
    GL["📋 GearList<br>entries · totals"]
    BRP["🎒 BagRecommendationPanel<br>handlebar · frame · seat"]
    AB["👤 AuthButton<br>magic link modal"]
    LS["🌍 LanguageSwitcher"]

    LL --> TC
    TC --> CB
    TC --> GC
    GC --> SB
    GC --> PP
    GC --> GL
    GC --> BRP
    GC --> AB
    GC --> LS

    style LL fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style TC fill:#fef3c7,stroke:#d97706,color:#451a03
    style CB fill:#fce7f3,stroke:#db2777,color:#500724
    style GC fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style SB fill:#d1fae5,stroke:#059669,color:#064e3b
    style PP fill:#d1fae5,stroke:#059669,color:#064e3b
    style GL fill:#d1fae5,stroke:#059669,color:#064e3b
    style BRP fill:#d1fae5,stroke:#059669,color:#064e3b
    style AB fill:#fff7ed,stroke:#ea580c,color:#431407
    style LS fill:#f0fdf4,stroke:#16a34a,color:#14532d
```

---

## Auto-save flow

```mermaid
sequenceDiagram
    participant U as 👤 User action
    participant GC as ⚙️ GearCalculator
    participant T as ⏱️ debounce timer
    participant AC as 🛑 AbortController
    participant API as ⚡ /api/lists

    rect rgb(224, 242, 254)
        Note over U,GC: User makes a change
        U->>GC: add / remove / qty change
        GC->>T: clearTimeout(prev)
        GC->>T: setTimeout(saveList, 2000ms)
    end

    rect rgb(209, 250, 229)
        Note over T,API: Debounce fires
        T->>AC: abort previous request
        T->>API: POST {listId, items}
        API-->>GC: {ok: true}
        GC-->>U: ✅ Saved indicator
    end

    Note over GC: If user changes list again<br>within 2s — timer resets,<br>previous request aborted
```

---

## Search index strategy

```mermaid
graph TD
    INSERT["✏️ INSERT / UPDATE<br>gear_items"]
    TRG["⚡ BEFORE trigger:<br>gear_items_search_text_trigger"]
    ST["📝 search_text =<br>lower(names_json::text<br>|| aliases_json::text)"]
    GIN["🔍 GIN trigram index<br>idx_gear_items_search_gin"]
    Q["🔎 ILIKE '%query%'<br>on search_text"]
    RS["✅ ≤20 rows returned<br>re-ranked in JS"]

    INSERT --> TRG --> ST --> GIN
    Q -->|uses index| GIN
    GIN --> RS

    style INSERT fill:#fef3c7,stroke:#d97706,color:#451a03
    style TRG fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style ST fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style GIN fill:#d1fae5,stroke:#059669,color:#064e3b
    style Q fill:#fce7f3,stroke:#db2777,color:#500724
    style RS fill:#d1fae5,stroke:#059669,color:#064e3b
```

---

## Deployment topology

```mermaid
graph TD
    GH["🐙 GitHub<br>main branch"]
    VR["⬡ Vercel<br>Next.js serverless<br>Edge CDN"]
    SB["🐘 Supabase<br>EU region<br>Postgres + Auth"]
    CF["🔶 Cloudflare<br>DNS + DDoS"]
    PL["📊 Plausible<br>analytics"]
    ANT["🤖 Anthropic API<br>Claude Haiku"]
    DOM["🌐 veloadout.com"]

    GH -->|push → auto deploy| VR
    CF -->|CNAME| VR
    DOM --> CF
    VR -->|REST API| SB
    VR -->|API calls| ANT
    VR -.->|script tag| PL

    style GH fill:#f3f4f6,stroke:#6b7280,color:#111827
    style VR fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    style SB fill:#d1fae5,stroke:#059669,color:#064e3b
    style CF fill:#fef3c7,stroke:#d97706,color:#451a03
    style PL fill:#e0e7ff,stroke:#6366f1,color:#1e1b4b
    style ANT fill:#fce7f3,stroke:#db2777,color:#500724
    style DOM fill:#fff7ed,stroke:#ea580c,color:#431407
```
