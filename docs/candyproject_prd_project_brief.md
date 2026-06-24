# PRD: CandyProject — Joyful & Intelligent Productivity

## 1. Project Overview
CandyProject is an AI-native project management platform designed to transform task tracking from a chore into a delightful experience. It combines a vibrant, playful design language ("Candy") with deep AI integration to automate management overhead, predict project risks, and foster team health.

## 2. North Star Metric: "Time to Delight"
Our goal is to reduce the cognitive load of project management by 40% through AI-driven automation while maintaining high engagement through a playful, high-fidelity UI.

## 3. Core Personas
*   **The Team Lead (Leonardo):** Needs high-level health metrics, velocity tracking, and capacity planning.
*   **The Individual Contributor (Alex/Sophie):** Needs a clean, focused task view and proactive help from the AI Sidekick to unblock work.
*   **The Product Owner (Elena):** Needs sprint planning tools and roadmap visibility.

## 4. Feature Requirements

### 4.1 Intelligent Kanban System
*   **Adaptive Columns:** Standard To-Do, In Progress, Review, and Done states with smart sorting based on priority.
*   **AI Sidekick Integration:** A persistent chat interface that understands board context, nudges assignees for updates, and predicts velocity.
*   **Rich Task Cards:** Visual tags for departments (Design, Dev, Marketing), assignee avatars, and "IA Insight" badges for AI-generated summaries.

### 4.2 Sprint Planning & Management
*   **Active Sprint Dashboard:** Real-time progress bar (percentage based on points).
*   **Automated Prioritization:** AI suggestions for which backlog items should be pulled into the next sprint based on historical velocity.
*   **Blocker Detection:** Real-time scanning of task comments and status to flag potential delays.

### 4.3 Analytics & Team Health
*   **Predictive Burndown:** A burndown chart showing both actual progress and an AI-projected trend line.
*   **Member Statistics:** Individual velocity tracking vs. capacity.
*   **Capacity Planning:** Visual indicators for "Overloaded," "Ready for Work," and "Optimal Mood" to prevent burnout.

### 4.4 Workspace Configuration
*   **Visual Identity:** Full control over brand palette (Candy theme defaults) and workspace iconography.
*   **Smart Automations:** Toggle-based controls for AI Sprint Summaries, Auto-Archiving, and Integration triggers (Slack/GitHub).

## 5. Visual Identity & Design System (Candy)
*   **Core Color:** `#e040a0` (Hot Pink).
*   **Typography:** DM Sans (Clean, modern, readable).
*   **Shape Language:** High corner radius (Pill-shaped buttons, rounded containers).
*   **Mood:** Energetic, vibrant, saturated, and approachable.

## 6. Technical Stack (Proposed)
*   **Frontend:** HTML5, Tailwind CSS (for the "Candy" design system utility classes).
*   **AI Layer:** Large Language Model (LLM) for context-aware board analysis and predictive analytics.
*   **Interactions:** Bouncy CSS animations and glassmorphism effects for the sidebar and modals.

## 7. Roadmap
*   **Phase 1:** Core Kanban and Sprint execution views (Completed).
*   **Phase 2:** Predictive analytics and Team health metrics (Completed).
*   **Phase 3:** Advanced AI-driven resource leveling and cross-project dependencies.
