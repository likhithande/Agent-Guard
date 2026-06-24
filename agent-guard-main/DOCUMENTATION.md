# Agent Guard: AI-Powered Financial Auditing Platform

## Project Overview
**Agent Guard** is a secure, AI-powered financial auditing application designed to automate the detection of anomalies in financial documents. It leverages advanced AI agents and robust data models to provide auditors with deep insights, risk assessments, and comprehensive reporting.

---

## 🏗 System Architecture

### 1. Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript for type safety.
- **Styling**: Tailwind CSS for responsive and modern UI.
- **Icons**: Lucide-React.
- **Animations**: Framer Motion.
- **Build Tool**: Vite.

### 2. Backend & AI (Python + Google ADK)
- **Language**: Python 3.10+.
- **AI Engine**: Google ADK (Agent Development Kit).
- **Core Agent**: Initialized with `gemini-1.5-flash` for high-speed document processing and reasoning.

### 3. Backend-as-a-Service (Firebase)
- **Authentication**: Firebase Auth (Email/Password, Google Sign-in).
- **Database**: Firestore (NoSQL) for storing user profiles and audit metadata.

---

## 📊 Data Models

### Core Types (`src/types.ts`)

| Model | Purpose | Key Fields |
| :--- | :--- | :--- |
| **Document** | Represents an uploaded file. | `id`, `name`, `type`, `status` (processing/completed) |
| **Anomaly** | Represents a detected issue. | `type` (duplicate/outlier/etc), `severity`, `details`, `suggestedAction` |
| **AnalysisResult** | The aggregate result of an audit. | `riskScore` (0-100), `totalTransactions`, `heatmapData` |

### Heatmap Data Model (Hashmap)
The application uses a **Nested Hashmap (Record)** for high-performance time-based lookups:
```typescript
Record<string, Record<string, number>>
```
- **Key 1**: Day of the week (e.g., 'Mon').
- **Key 2**: Hour slot (e.g., '9AM').
- **Value**: Number of transactions in that period.

---

## 🤖 AI Agents & Tools

### 1. The Auditor Agent (`Backend/main.py`)
- **Model**: `gemini-1.5-flash`.
- **Persona**: **AI Financial Auditor Agent**.
- **Objective**: Detect anomalies (duplicates, 3-sigma outliers, unusual patterns) and assess financial risk.
- **Strict Logic**: Operates under a "Strict JSON only" protocol to ensure seamless data flow.

### 2. The Compliance Agent (`Backend/main.py`)
- **Model**: `gemini-1.5-flash`.
- **Persona**: **Financial Compliance Agent**.
- **Specialization**: Tax laws, regulatory frameworks (SOX, GDPR, etc.), and corporate policies.
- **Objective**: Verify audit findings against regulations to identify violations.

### 3. The Forensic Agent (`Backend/main.py`)
- **Model**: `gemini-1.5-flash`.
- **Persona**: **Forensic Financial Investigation Agent**.
- **Objective**: Detect high-level fraud patterns like money laundering or circular money flows.
- **Focus**: Behavior-based pattern recognition and transaction relationship mapping.

### 4. The Notification Agent (`Backend/main.py`)
- **Model**: `gemini-1.5-flash`.
- **Persona**: **Risk Notification Decision Agent**.
- **Objective**: Decide if human intervention is required based on audit severity.

### 5. The Report Agent (`Backend/main.py`)
- **Model**: `gemini-1.5-flash`.
- **Persona**: **Financial Audit Report Generation Agent**.
- **Objective**: Synthesize all findings into a professional, legally-safe audit report.
- **Tasks**:
    - Writing high-level executive summaries.
    - Consolidating risks, compliance issues, and forensic findings.
    - Providing clear, actionable auditor recommendations.
- **Style**: Professional, neutral, and suitable for enterprise or government submission.

### 6. Voice Query Assistant (`src/components/VoiceQuery.tsx`)
- **Type**: Interactive User Interface Agent.
- **Function**: Provides a natural language interface for auditors to ask questions like *"What is the risk score?"* or *"Show me high severity anomalies."*
- **Technology**: Uses Web Speech API for recognition and an internal reasoning engine to parse the `AnalysisResult`.

### 3. Report Generation Agent (`src/components/ReportViewer.tsx`)
- **Function**: Transforms raw audit data into human-readable narratives.
- **Formats**: TXT, HTML, and PDF (via `html2pdf.js`).

---

## 📂 Key Components & Modules

### Authentication & Security
- **`AuthContext.tsx`**: Manages user state and session using Firebase.
- **`firebase.ts`**: Configures and initializes Auth and Firestore instances.

### User Interface
- **`DashboardHome.tsx`**: The main orchestrator for view switching (Upload -> Dashboard -> Report).
- **`DocumentUpload.tsx`**: handles multi-file ingestion with drag-and-drop support. Supports PDF, CSV, Excel, and Images.
- **`Dashboard.tsx`**: Visualizes metrics using Recharts (Line/Bar charts) and summary cards.
- **`Heatmap.tsx`**: A custom-built component using the Hashmap model to display transaction frequency via a color-coded grid (Green-to-Red intensity).

---

## 🚀 Future Scalability: Models & Agents to Use

1.  **Specialized LLMs**:
    - **`gemini-1.5-pro`**: For complex deep-dive audits requiring larger context windows (e.g., cross-referencing years of data).
    - **`gemini-1.5-flash`**: Ideal for real-time document extraction (OCR) and initial anomaly classification.

2.  **Agentic Roles to Implement**:
    - **Compliance Agent**: An agent specifically tuned to local tax laws and corporate policies.
    - **Forensic Agent**: Capable of deep-linking transaction graphs to identify money laundering or complex fraud patterns.
    - **Notification Agent**: Auto-triggers alerts via Firebase Cloud Messaging when a "High" severity anomaly is detected.

---

## 🛠 Setup & Development
- **Frontend**: `npm run dev`
- **Build**: `npm run build`
- **Backend Environment**: `.venv` with `google-adk` and `firebase-admin` dependencies.
