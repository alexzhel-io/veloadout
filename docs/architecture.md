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

    style User fill:#7c3aed,stroke:#5b21b6,color:#fff
    style Vercel fill:#1c1a2e,stroke:#7c3aed,color:#fff
    style Supabase fill:#1e4d3a,stroke:#34d399,color:#fff
    style Anthropic fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style Web fill:#2d2d2d,stroke:#888,color:#fff
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

    style P fill:#7c3aed,stroke:#5b21b6,color:#fff
    style A fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style D fill:#1e4d3a,stroke:#34d399,color:#fff
    style I fill:#4d1e1e,stroke:#f87171,color:#fff
```

> Стрелки направлены внутрь: Domain не зависит ни от чего. Infrastructure зависит от Domain, но не наоборот.

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
│   │   ├── anonClient.ts                ← plain client (writes)
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
    participant B as Browser
    participant API as /api/lookup
    participant Repo as SupabaseGearItemRepository
    participant DB as Supabase Postgres
    participant AI as ClaudeGearSearchService
    participant LLM as Claude Haiku

    B->>API: GET ?q=MSR Hubba&db_only=1
    API->>Repo: findByQuery()
    Repo->>DB: SELECT WHERE search_text ILIKE '%msr hubba%'
    DB-->>Repo: [] not found
    Repo-->>API: null
    API-->>B: {status: "not_found"}

    B->>API: GET ?q=MSR Hubba
    API->>Repo: findByQuery()
    Repo->>DB: ILIKE query
    DB-->>Repo: [] not found
    Repo-->>API: null
    API->>AI: search("MSR Hubba")
    AI->>LLM: system prompt + user query
    LLM-->>AI: tool_use: web_search
    AI->>LLM: tool_result (web content)
    LLM-->>AI: text: JSON with variants
    AI-->>API: GearSearchResult
    API-->>B: {status:"found_ai", item, variants}

    Note over B: User sees ConfirmCard<br>selects size variant

    B->>API: POST {item: {...}}
    API->>Repo: save(GearItem)
    Repo->>DB: UPSERT gear_items
    DB-->>Repo: ok
    API-->>B: {ok: true}
```

---

## Auth flow

```mermaid
sequenceDiagram
    participant U as User
    participant App as Veloadout
    participant API as /api/auth
    participant SB as Supabase Auth
    participant Email as Email inbox

    U->>App: clicks Sign in
    U->>App: enters email
    App->>API: POST {email, locale}
    API->>SB: signInWithOtp(email)
    SB->>Email: magic link → /[locale]/auth/callback
    API-->>App: {ok: true}
    App-->>U: "Check your email"

    U->>Email: opens link
    Email->>App: GET /[locale]/auth/callback?code=xxx
    App->>SB: exchangeCodeForSession(code)
    SB-->>App: session cookie
    App-->>U: redirect → /[locale]

    Note over App,SB: Middleware refreshes<br>session on every request
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
    subgraph gear_items["gear_items (shared catalog)"]
        GI_R["SELECT<br>anyone"]
        GI_I["INSERT<br>anyone"]
        GI_U["UPDATE<br>anyone"]
    end

    subgraph gear_lists["gear_lists (user data)"]
        GL_ALL["ALL ops<br>own rows only<br>auth.uid() = user_id"]
    end

    subgraph gear_list_items["gear_list_items (user data)"]
        GLI_ALL["ALL ops<br>via own lists only"]
    end

    style GI_R fill:#1e4d3a,stroke:#34d399,color:#fff
    style GI_I fill:#1e4d3a,stroke:#34d399,color:#fff
    style GI_U fill:#1e4d3a,stroke:#34d399,color:#fff
    style GL_ALL fill:#4d3a1e,stroke:#fb923c,color:#fff
    style GLI_ALL fill:#4d3a1e,stroke:#fb923c,color:#fff
```

---

## Supabase client usage

```mermaid
graph TD
    SC["server.ts<br>createServerSupabaseClient<br>reads auth cookies"]
    BC["client.ts<br>createBrowserClient<br>browser-side auth"]
    AC["anonClient.ts<br>plain createClient<br>no cookies"]

    SC -->|auth check| PG["app/[locale]/page.tsx"]
    SC -->|session refresh| MW["middleware.ts"]
    SC -->|read user lists| LR["GET /api/lists"]
    SC -->|save user lists| LS["POST /api/lists"]
    SC -->|gear search| GS["GET /api/lookup"]
    AC -->|save gear catalog| GW["POST /api/lookup"]
    BC -->|sign out| AB["AuthButton.tsx"]

    style SC fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style BC fill:#4d1e4d,stroke:#c084fc,color:#fff
    style AC fill:#1e4d3a,stroke:#34d399,color:#fff
```

> `anonClient` используется специально для записи в `gear_items` —<br>cookie-based клиент падал с `TypeError: fetch failed` при upsert на сервере.

---

## API routes

```mermaid
graph LR
    subgraph Public["Public (no auth)"]
        L1["GET /api/lookup?db_only=1<br>fast DB search"]
        L2["GET /api/lookup<br>DB → AI fallback"]
        L3["POST /api/lookup<br>save confirmed item"]
        P["GET /api/presets<br>static presets list"]
    end

    subgraph Auth["Auth (Supabase session)"]
        A1["POST /api/auth<br>send magic link"]
        A2["DELETE /api/auth<br>sign out"]
        LS1["GET /api/lists<br>load user list"]
        LS2["POST /api/lists<br>save user list"]
        LS3["DELETE /api/lists<br>GDPR delete"]
    end

    style L1 fill:#1e4d3a,stroke:#34d399,color:#fff
    style L2 fill:#1e4d3a,stroke:#34d399,color:#fff
    style L3 fill:#1e4d3a,stroke:#34d399,color:#fff
    style P fill:#1e4d3a,stroke:#34d399,color:#fff
    style A1 fill:#4d3a1e,stroke:#fb923c,color:#fff
    style A2 fill:#4d3a1e,stroke:#fb923c,color:#fff
    style LS1 fill:#4d3a1e,stroke:#fb923c,color:#fff
    style LS2 fill:#4d3a1e,stroke:#fb923c,color:#fff
    style LS3 fill:#4d3a1e,stroke:#fb923c,color:#fff
```

---

## Rate limiting

```mermaid
graph TD
    R["Request"]
    RL["checkRateLimit<br>in-memory buckets<br>Map key → count + resetAt"]
    OK["✅ pass through"]
    BLOCK["🚫 429 Too Many Requests"]

    R --> RL
    RL -->|allowed| OK
    RL -->|exceeded| BLOCK

    L1["AI lookup<br>20 req / IP / hour"]
    L2["Magic link by IP<br>5 req / IP / 10 min"]
    L3["Magic link by email<br>3 req / email / 10 min"]

    style R fill:#2d2d2d,stroke:#888,color:#fff
    style RL fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style OK fill:#1e4d3a,stroke:#34d399,color:#fff
    style BLOCK fill:#4d1e1e,stroke:#f87171,color:#fff
    style L1 fill:#1c1a2e,stroke:#7c3aed,color:#fff
    style L2 fill:#1c1a2e,stroke:#7c3aed,color:#fff
    style L3 fill:#1c1a2e,stroke:#7c3aed,color:#fff
```

---

## i18n routing

```mermaid
graph LR
    REQ["request /"]
    MW["middleware.ts<br>next-intl + Supabase session"]
    EN["/en"]
    DE["/de"]
    RU["/ru"]
    MSG["messages/<br>en.json · de.json · ru.json"]

    REQ -->|detect locale| MW
    MW --> EN
    MW --> DE
    MW --> RU
    EN & DE & RU -->|getMessages| MSG

    style REQ fill:#2d2d2d,stroke:#888,color:#fff
    style MW fill:#7c3aed,stroke:#5b21b6,color:#fff
    style EN fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style DE fill:#1e4d3a,stroke:#34d399,color:#fff
    style RU fill:#4d3a1e,stroke:#fb923c,color:#fff
    style MSG fill:#1c1a2e,stroke:#7c3aed,color:#fff
```

---

## Frontend component tree

```mermaid
graph TD
    LL["LocaleLayout<br>html · body · providers"]
    TC["ToastProvider"]
    CB["CookieBanner"]
    GC["GearCalculator<br>state: entries · listId · saving"]

    SB["SearchBar<br>two-stage search<br>ConfirmCard"]
    PP["PresetPanel<br>toggle presets"]
    GL["GearList<br>entries · totals"]
    BRP["BagRecommendationPanel<br>handlebar · frame · seat"]
    AB["AuthButton<br>magic link modal"]
    LS["LanguageSwitcher"]

    LL --> TC
    TC --> CB
    TC --> GC
    GC --> SB
    GC --> PP
    GC --> GL
    GC --> BRP
    GC --> AB
    GC --> LS

    style LL fill:#7c3aed,stroke:#5b21b6,color:#fff
    style TC fill:#4d3a1e,stroke:#fb923c,color:#fff
    style GC fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style SB fill:#1e4d3a,stroke:#34d399,color:#fff
    style PP fill:#1e4d3a,stroke:#34d399,color:#fff
    style GL fill:#1e4d3a,stroke:#34d399,color:#fff
    style BRP fill:#1e4d3a,stroke:#34d399,color:#fff
    style CB fill:#4d1e1e,stroke:#f87171,color:#fff
    style AB fill:#1c1a2e,stroke:#7c3aed,color:#fff
    style LS fill:#1c1a2e,stroke:#7c3aed,color:#fff
```

---

## Auto-save flow

```mermaid
sequenceDiagram
    participant U as User action
    participant GC as GearCalculator
    participant T as debounce timer
    participant AC as AbortController
    participant API as /api/lists

    U->>GC: add / remove / qty change
    GC->>T: clearTimeout(prev)
    GC->>T: setTimeout(saveList, 2000ms)
    Note over T: waits 2 seconds...
    T->>AC: abort previous request
    T->>API: POST {listId, items}
    API-->>GC: {ok: true}
    GC-->>U: ✅ Saved toast / indicator

    Note over GC: If user changes list<br>again within 2s —<br>timer resets, request aborted
```

---

## Search index strategy

```mermaid
graph TD
    INSERT["INSERT / UPDATE<br>gear_items"]
    TRG["BEFORE trigger:<br>gear_items_search_text_trigger"]
    ST["search_text =<br>lower(names_json::text<br>|| aliases_json::text)"]
    GIN["GIN trigram index<br>idx_gear_items_search_gin"]
    Q["ILIKE '%query%'<br>on search_text"]
    RS["≤20 rows returned<br>re-ranked in JS"]

    INSERT --> TRG --> ST --> GIN
    Q -->|uses index| GIN
    GIN --> RS

    style INSERT fill:#4d3a1e,stroke:#fb923c,color:#fff
    style TRG fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style ST fill:#1c1a2e,stroke:#7c3aed,color:#fff
    style GIN fill:#1e4d3a,stroke:#34d399,color:#fff
    style Q fill:#2d2d2d,stroke:#888,color:#fff
    style RS fill:#1e4d3a,stroke:#34d399,color:#fff
```

---

## Deployment topology

```mermaid
graph TD
    GH["GitHub<br>alexzhel-io/veloadout<br>main branch"]
    VR["Vercel<br>Next.js serverless<br>Edge CDN"]
    SB["Supabase<br>EU region<br>Postgres + Auth"]
    CF["Cloudflare<br>DNS + DDoS"]
    PL["Plausible<br>analytics"]
    ANT["Anthropic API<br>Claude Haiku"]
    DOM["veloadout.com"]

    GH -->|push → auto deploy| VR
    CF -->|CNAME| VR
    DOM --> CF
    VR -->|REST API| SB
    VR -->|API calls| ANT
    VR -.->|script tag| PL

    style GH fill:#2d2d2d,stroke:#888,color:#fff
    style VR fill:#1c1a2e,stroke:#7c3aed,color:#fff
    style SB fill:#1e4d3a,stroke:#34d399,color:#fff
    style CF fill:#4d3a1e,stroke:#fb923c,color:#fff
    style PL fill:#1e3a4d,stroke:#60a5fa,color:#fff
    style ANT fill:#4d1e4d,stroke:#c084fc,color:#fff
    style DOM fill:#7c3aed,stroke:#5b21b6,color:#fff
```
