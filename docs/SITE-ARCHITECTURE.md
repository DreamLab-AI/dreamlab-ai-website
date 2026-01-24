# DreamLab AI Website Architecture

## Navigation Flowchart

```mermaid
flowchart TD
    subgraph Header["Header Navigation"]
        H[Header Component]
        H --> HOME["/"]
        H --> TEAM["/team"]
        H --> RES["/residential-training"]
        H --> WS["/workshops"]
        H --> WORK["/work"]
        H --> SD["/system-design"]
        H --> CONTACT["/contact"]
    end

    subgraph Pages["Main Pages"]
        HOME --> |"CTA Button"| MC["/masterclass#content"]
        MC --> |"Book Now"| CONTACT
        RES --> |"Enquire"| CONTACT
        SD --> |"Read Paper"| RP["/research-paper"]
        RP --> |"Back"| SD
    end

    subgraph Workshops["Workshop System"]
        WS --> |"Select Workshop"| WP["/workshops/:workshopId"]
        WP --> |"Navigate Pages"| WPP["/workshops/:workshopId/:pageSlug"]
        WPP --> |"Breadcrumb"| WS
        WS --> |"Residential CTA"| RES
        WS --> |"Contact CTA"| CONTACT
    end

    subgraph Footer["Footer Links"]
        F[Footer Component]
        F --> PRIV["/privacy"]
        F --> BSK["Bluesky ↗"]
        F --> LI["LinkedIn ↗"]
    end

    subgraph Utility["Utility Routes"]
        ANY["/*"] --> NF["/404 NotFound"]
    end

    style HOME fill:#4F46E5,color:#fff
    style MC fill:#0891B2,color:#fff
    style RES fill:#7C3AED,color:#fff
    style CONTACT fill:#059669,color:#fff
```

## User Journey Flowchart

```mermaid
flowchart LR
    subgraph Entry["Entry Points"]
        SEARCH[("Google/SEO")]
        DIRECT[("Direct URL")]
        SOCIAL[("Social Media")]
    end

    subgraph Landing["Landing"]
        INDEX["Homepage<br/>Hero + CTA"]
    end

    subgraph Discovery["Discovery Phase"]
        TEAM["Team Page<br/>43 Specialists"]
        WORK["Previous Work<br/>Portfolio"]
        WORKSHOPS["Workshops Index<br/>Learning Paths"]
    end

    subgraph Products["Product Pages"]
        MASTER["Masterclass<br/>£1,495 pp"]
        RESIDENTIAL["Residential<br/>from £995/day"]
    end

    subgraph Conversion["Conversion"]
        CONTACT["Contact Form"]
        BOOK["Booking Complete"]
    end

    SEARCH --> INDEX
    DIRECT --> INDEX
    SOCIAL --> INDEX

    INDEX --> |"Learn More"| MASTER
    INDEX --> |"Explore"| TEAM
    INDEX --> |"Explore"| WORK
    INDEX --> |"Explore"| WORKSHOPS

    TEAM --> |"Enquire"| CONTACT
    WORK --> |"Get in Touch"| CONTACT
    WORKSHOPS --> |"Residential CTA"| RESIDENTIAL

    MASTER --> |"Book Now"| CONTACT
    RESIDENTIAL --> |"Enquire"| CONTACT

    CONTACT --> BOOK

    style INDEX fill:#4F46E5,color:#fff
    style MASTER fill:#0891B2,color:#fff
    style RESIDENTIAL fill:#7C3AED,color:#fff
    style CONTACT fill:#059669,color:#fff
    style BOOK fill:#10B981,color:#fff
```

## Route Structure

```mermaid
graph TD
    subgraph Routes["React Router Structure"]
        ROOT["/"] --> INDEX["Index.tsx"]
        ROOT --> TEAM_R["/team"] --> TEAM_P["Team.tsx"]
        ROOT --> WORK_R["/work"] --> WORK_P["Work.tsx"]
        ROOT --> WS_R["/workshops"] --> WS_P["WorkshopIndex.tsx"]
        WS_R --> WS_ID["/workshops/:id"] --> WS_PAGE["WorkshopPage.tsx"]
        WS_ID --> WS_SLUG["/workshops/:id/:slug"] --> WS_PAGE
        ROOT --> RES_R["/residential-training"] --> RES_P["ResidentialTraining.tsx"]
        ROOT --> MC_R["/masterclass"] --> MC_P["Masterclass.tsx"]
        ROOT --> CONTACT_R["/contact"] --> CONTACT_P["Contact.tsx"]
        ROOT --> PRIV_R["/privacy"] --> PRIV_P["Privacy.tsx"]
        ROOT --> SD_R["/system-design"] --> SD_P["SystemDesign.tsx"]
        ROOT --> RP_R["/research-paper"] --> RP_P["ResearchPaper.tsx"]
        ROOT --> CATCH["/*"] --> NF_P["NotFound.tsx"]
    end

    style ROOT fill:#1E293B,color:#fff
    style INDEX fill:#4F46E5,color:#fff
    style MC_P fill:#0891B2,color:#fff
    style RES_P fill:#7C3AED,color:#fff
```

## Component Hierarchy

```mermaid
graph TD
    APP["App.tsx"] --> PROVIDERS["Providers<br/>(Query, Tooltip, Toast)"]
    PROVIDERS --> ROUTER["BrowserRouter"]
    ROUTER --> ROUTES["Routes"]

    ROUTES --> PAGES["Page Components"]

    PAGES --> INDEX["Index"]
    PAGES --> MASTERCLASS["Masterclass"]
    PAGES --> TEAM["Team"]
    PAGES --> WORKSHOPS["WorkshopIndex/Page"]

    INDEX --> HEADER["Header"]
    INDEX --> HERO["HyperdimensionalHeroBackground"]
    INDEX --> TESTIMONIALS["TestimonialMoments"]
    INDEX --> INSTRUCTORS["FeaturedInstructors"]
    INDEX --> EXCLUSIVITY["ExclusivityBanner"]
    INDEX --> CASESTUDY["CaseStudyNarrative"]
    INDEX --> EMAIL["EmailSignupForm"]
    INDEX --> FOOTER["Footer"]

    MASTERCLASS --> HEADER
    MASTERCLASS --> TORUSKNOT["TorusKnot 3D"]
    MASTERCLASS --> PRICINGCARDS["Pricing Cards"]
    MASTERCLASS --> FAQ["FAQ Accordion"]

    TEAM --> HEADER
    TEAM --> TEAMMEMBERS["TeamMember Cards"]

    style APP fill:#1E293B,color:#fff
    style INDEX fill:#4F46E5,color:#fff
    style MASTERCLASS fill:#0891B2,color:#fff
```

## Page Summary

| Route | Component | Purpose | Primary CTA |
|-------|-----------|---------|-------------|
| `/` | Index | Homepage with hero, testimonials, instructors | → `/masterclass#content` |
| `/masterclass` | Masterclass | AI Agent Masterclass details + pricing | → `/contact` |
| `/residential-training` | ResidentialTraining | Multi-day residential programme | → `/contact` |
| `/team` | Team | 43 specialists grid with selection | → `/contact?team=...` |
| `/work` | Work | Portfolio/previous projects | → `/contact` |
| `/workshops` | WorkshopIndex | Workshop catalogue & learning paths | → Workshop pages |
| `/workshops/:id/:slug` | WorkshopPage | Individual workshop content | → Next chapter |
| `/system-design` | SystemDesign | Technical architecture showcase | → `/research-paper` |
| `/research-paper` | ResearchPaper | Academic paper presentation | → `/system-design` |
| `/contact` | Contact | Enquiry/booking form | Form submission |
| `/privacy` | Privacy | Privacy policy | — |

## Key User Flows

### 1. Workshop Booking Flow
```
Homepage → Masterclass → Pricing Cards → Contact Form → Booking
```

### 2. Residential Enquiry Flow
```
Homepage → Residential Training → Programme Details → Contact Form
```

### 3. Team Selection Flow
```
Team Page → Select Members → "Enquire About Availability" → Contact (with pre-selected team)
```

### 4. Workshop Learning Flow
```
Workshops Index → Select Workshop → Navigate Chapters → Complete Workshop
```

## Technical Notes

- **Lazy Loading**: All page components are lazy-loaded via `React.lazy()`
- **Suspense**: `RouteLoader` component shown during page transitions
- **Dynamic Routes**: Workshop pages use `:workshopId` and `:pageSlug` params
- **Hash Navigation**: Masterclass uses `#content` anchor for scroll-to-section
- **Query Params**: Contact page accepts `?team=` for pre-selected team members

## File Locations

```
src/
├── App.tsx              # Router configuration
├── pages/
│   ├── Index.tsx        # Homepage
│   ├── Masterclass.tsx  # AI Agent Masterclass
│   ├── Team.tsx         # Team gallery
│   ├── Work.tsx         # Portfolio
│   ├── Contact.tsx      # Contact form
│   ├── Privacy.tsx      # Privacy policy
│   ├── WorkshopIndex.tsx    # Workshop catalogue
│   ├── WorkshopPage.tsx     # Individual workshop
│   ├── ResidentialTraining.tsx  # Residential programme
│   ├── SystemDesign.tsx     # System design showcase
│   ├── ResearchPaper.tsx    # Research paper
│   └── NotFound.tsx     # 404 page
└── components/
    ├── Header.tsx       # Navigation header
    └── ...              # Shared components
```
