# Feature Specification: beingc

**Feature Branch**: `001-wellbeing-notes`
**Created**: 2026-03-30
**Status**: Draft
**Input**: User description: "Build an application that can help a user make daily notes about well being and also search previous ones. A very small mobile first webapp for daily notes about one's well being. The webapp only works when the user is online. User has to logon/login. Then user gets a screen with on the first line a menu-button and a broad search bar and under this line for each day note a date and first two textlines. By click the note can be chosen and will open a screen with on the first line a pictogram with i and a tree dot action button, the rest of the screen is for the box editing the note. The menu-bottom contains 'all' (link to first page) and 'setting' (link to a setting page). All notes go into a sqllite database with at least a date field, a userid, a being score (0-10) and a text-field. At the right side of the screen is a small vertical slider (color brown at bottom, yellow at top) with the handle at 5."

## User Scenarios & Testing

### User Story 1 — Secure Login (Priority: P1)

A registered user opens the app on their mobile browser. They see a login screen, enter their credentials, and are taken to their personal notes list. An unrecognised user cannot proceed beyond the login screen.

**Why this priority**: All other functionality depends on knowing who the user is. Without authentication, no note can be attributed to a person and no data is shown.

**Independent Test**: Open the app, attempt to log in with valid credentials → land on the notes list. Attempt with invalid credentials → stay on login screen with an error message.

**Acceptance Scenarios**:

1. **Given** the user is not logged in, **When** they open the app, **Then** they see only the login screen — no notes or navigation are visible.
2. **Given** valid credentials, **When** the user submits the login form, **Then** they are taken to the notes list screen.
3. **Given** invalid credentials, **When** the user submits the login form, **Then** an actionable error message is shown and they remain on the login screen.
4. **Given** the user is logged in, **When** they close and reopen the app within the same session, **Then** they return directly to the notes list without re-entering credentials.

---

### User Story 2 — Browse and Search Notes (Priority: P1)

After login the user lands on the notes list. Each entry shows the note's date and the first two lines of text. A search bar at the top lets the user filter notes by content. A menu button sits alongside the search bar.

**Why this priority**: This is the central screen of the app — the entry point to all notes and the primary navigation hub.

**Independent Test**: Log in with an account that has at least two notes → notes list renders with date and preview text for each. Type a keyword in the search bar → only matching notes remain visible.

**Acceptance Scenarios**:

1. **Given** the user is on the notes list, **When** the screen loads, **Then** notes are shown in reverse-chronological order, each displaying the date and the first two lines of the note text.
2. **Given** the notes list, **When** the user types in the search bar, **Then** the list updates in real time to show only notes whose text contains the search term.
3. **Given** the notes list, **When** no search term is entered, **Then** all notes for the logged-in user are shown.
4. **Given** the notes list, **When** the search yields no results, **Then** an empty-state message is shown (not a blank screen).
5. **Given** the notes list, **When** the user has no notes at all, **Then** an empty-state message with a prompt to create the first note is shown.

---

### User Story 3 — Create and Edit a Note (Priority: P1)

The user taps a note in the list to open it in the editing view. The full note text is editable. A vertical wellbeing slider on the right side of the screen (brown at the bottom, yellow at the top, defaulting to 5 out of 10) lets the user record how they feel. The user can save or discard changes. A new note can also be initiated from the notes list.

**Why this priority**: Recording a note is the core value of the app — without it the app has no purpose.

**Independent Test**: Tap a note → editing screen opens with existing text and slider at its saved value. Change the text and move the slider → save → return to list → note preview reflects the updated first two lines.

**Acceptance Scenarios**:

1. **Given** the user taps a note in the list, **When** the editing screen opens, **Then** the full note text is shown in an editable field and the slider reflects the stored wellbeing score.
2. **Given** the editing screen, **When** the user adjusts the vertical slider, **Then** the handle moves along the track (brown bottom → yellow top) and the selected value (0–10) is visually indicated.
3. **Given** edited text and/or a new slider value, **When** the user saves, **Then** the note is persisted with the updated text and score and the user returns to the notes list.
4. **Given** the editing screen, **When** the user discards changes via the three-dot action menu, **Then** the note is unchanged and the user returns to the notes list.
5. **Given** the notes list, **When** the user initiates creating a new note, **Then** an empty editing screen opens with today's date pre-filled and the slider at 5.
6. **Given** the editing screen header, **When** the user taps the information icon (ⓘ), **Then** a brief explanation of the wellbeing score and note purpose is shown.

---

### User Story 4 — Delete a Note (Priority: P2)

From the note editing screen the user can delete the current note via the three-dot action menu. After deletion they return to the notes list, which no longer shows the deleted note.

**Why this priority**: Users need control over their own data. Deletion is a standard expected action for any note-taking tool.

**Independent Test**: Open a note → tap three-dot menu → choose Delete → confirm → return to list → note is gone from the list.

**Acceptance Scenarios**:

1. **Given** the editing screen, **When** the user taps the three-dot action button, **Then** a menu appears containing at minimum "Delete" and "Discard changes" options.
2. **Given** the user selects Delete, **When** they confirm the action, **Then** the note is permanently removed and they return to the notes list.
3. **Given** the user selects Delete, **When** they cancel the confirmation, **Then** the note is unchanged and the editing screen remains open.

---

### User Story 5 — Admin: Manage Users (Priority: P2)

When an admin account logs in, they are taken to a user management page instead of the notes list. The admin can view all registered users, create new user accounts, edit user details, delete accounts, and activate or deactivate individual users. A deactivated user cannot log in.

**Why this priority**: Admin control over user accounts is a prerequisite for operating the app in a managed context and must exist before the app is opened to multiple users.

**Independent Test**: Log in as admin → user management page loads with the list of all users. Create a new user → user appears in the list. Deactivate a user → that user cannot log in. Delete a user → user disappears from the list.

**Acceptance Scenarios**:

1. **Given** an admin account, **When** the admin logs in, **Then** they are taken to the user management page, not the notes list.
2. **Given** the user management page, **When** it loads, **Then** all registered users are listed with at minimum their name/email and their active/inactive status.
3. **Given** the user management page, **When** the admin creates a new user, **Then** the new account appears in the list and the user can log in with the provided credentials.
4. **Given** the user management page, **When** the admin edits a user's details (name or email), **Then** the changes are saved and reflected in the list.
5. **Given** the user management page, **When** the admin deactivates a user, **Then** that user's status changes to inactive and they cannot log in until reactivated.
6. **Given** a deactivated user account, **When** the user attempts to log in, **Then** they see an informative error message (e.g., "Your account is inactive — please contact the administrator").
7. **Given** the user management page, **When** the admin reactivates a deactivated user, **Then** that user can log in again.
8. **Given** the user management page, **When** the admin deletes a user, **Then** a confirmation step is shown; upon confirmation the account and all associated notes are permanently removed.
9. **Given** the user management page, **When** the admin tries to delete or deactivate their own admin account, **Then** the action is blocked with an explanatory message.

---

### User Story 6 — Settings Page (Priority: P3)

The bottom navigation bar always shows two items: "All" (returns to the notes list) and "Settings" (opens a settings page). The settings page shows the user's account information and a logout option.

**Why this priority**: Navigation structure must be complete for a coherent app, but settings content beyond account info is deferred.

**Independent Test**: Tap "Settings" in the bottom bar → settings page opens showing account info and logout. Tap "All" → notes list is shown.

**Acceptance Scenarios**:

1. **Given** any screen with bottom navigation visible, **When** the user taps "All", **Then** they are taken to the notes list.
2. **Given** any screen with bottom navigation visible, **When** the user taps "Settings", **Then** they are taken to the settings page.
3. **Given** the settings page, **When** it loads, **Then** the user's account name or email is displayed along with a logout option.
4. **Given** the settings page, **When** the user taps logout, **Then** their session ends and they are returned to the login screen.

---

### Edge Cases

- What happens when the device goes offline while editing? → Because the app requires an online connection, an offline warning banner is shown and saving is blocked until connectivity is restored.
- What happens when the user's session expires while the app is open? → The next save or navigation action redirects the user to the login screen with a session-expired message.
- What happens when the search bar is cleared after a search? → The full notes list is restored immediately.
- What happens when a note has only one line of text? → Only that one line is shown in the preview; no blank second line is rendered.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST require users to authenticate with email and password before accessing any note data.
- **FR-002**: The system MUST allow new users to register with an email address and password.
- **FR-003**: The notes list screen MUST show a menu button and a full-width search bar on the first line, and below it one row per note showing the note date and the first two lines of text.
- **FR-004**: The system MUST filter the notes list in real time as the user types in the search bar.
- **FR-005**: The system MUST allow the user to open any note from the list for editing.
- **FR-006**: The note editing screen MUST show on its first line an information icon (ⓘ) on the left and a three-dot action button on the right; the remainder of the screen is the editable note body.
- **FR-007**: The note editing screen MUST display a vertical wellbeing slider on the right side of the screen, styled brown at the bottom and yellow at the top, with a range of 0–10 and a default value of 5.
- **FR-008**: The system MUST persist each note with at minimum: a date, a user identifier, a wellbeing score (integer 0–10), and a free-text body.
- **FR-009**: The system MUST allow the user to create a new note with today's date pre-filled and the slider defaulting to 5.
- **FR-010**: The three-dot action menu on the editing screen MUST offer at minimum: "Discard changes" and "Delete note" options.
- **FR-011**: Deleting a note MUST require a confirmation step before the note is permanently removed.
- **FR-012**: The bottom navigation bar MUST contain exactly two items: "All" linking to the notes list, and "Settings" linking to the settings page.
- **FR-013**: The settings page MUST display the logged-in user's account information and a logout option.
- **FR-014**: The system MUST display a warning and prevent saving when the user's device is offline.
- **FR-015**: The system MUST redirect users without a valid session to the login screen before any note data is shown or modified.
- **FR-016**: The system MUST distinguish between a regular user role and an admin role; only admins have access to user management.
- **FR-017**: When an admin logs in, the system MUST present a user management page listing all registered users with their name/email and active/inactive status.
- **FR-018**: The admin MUST be able to create a new user account, providing at minimum a name/email and initial password.
- **FR-019**: The admin MUST be able to edit a user's name and email address.
- **FR-020**: The admin MUST be able to deactivate a user account; a deactivated user MUST NOT be able to log in and MUST receive a clear explanatory message when they attempt to do so.
- **FR-021**: The admin MUST be able to reactivate a previously deactivated user account, restoring their ability to log in.
- **FR-022**: The admin MUST be able to delete a user account; deletion MUST require confirmation and MUST permanently remove the account and all associated notes.
- **FR-023**: The system MUST prevent an admin from deactivating or deleting their own account.

### Key Entities

- **User**: An account that owns notes; identified by a unique user ID, an email address, a password credential, a role (admin or regular), and an active/inactive status. A regular user sees only their own notes.
- **Note**: A daily entry belonging to one user, comprising a date (defaulting to the creation date), a wellbeing score (integer 0–10), and a free-text body of arbitrary length. Each note belongs to exactly one user.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A user can log in and reach the notes list within 3 taps from the app's start screen.
- **SC-002**: The notes list updates visibly as the user types in the search bar, with no noticeable lag on a standard mobile data connection.
- **SC-003**: A user can create, save, and locate a new note in the list in under 60 seconds from the moment they are logged in.
- **SC-004**: Notes created by one user are never visible to or retrievable by another user (including the admin).
- **SC-007**: An admin can create, deactivate, and delete a user account in under 2 minutes from the user management page.
- **SC-008**: A deactivated user is blocked from logging in immediately after deactivation — no grace period.
- **SC-005**: The wellbeing slider is operable with a single thumb on screens 375 px wide or wider without accidentally activating neighbouring controls.
- **SC-006**: After losing and regaining internet connectivity, the user can successfully save a note without restarting the app.

## Assumptions

- The app is delivered as a web application accessed via a mobile browser; no native app installation is required.
- User registration (creating a new account) is in scope; a simple email + password flow is assumed.
- The SQLite database resides server-side; no data is stored on the user's device.
- The app requires an active internet connection at all times; offline-first caching or progressive-web-app background sync is out of scope.
- The "Settings" page content beyond account display and logout is deferred to a future iteration.
- Notes are never shared between users; each note belongs to exactly one user.
- The information icon (ⓘ) on the editing screen shows contextual help inline (e.g., a tooltip or modal), not a separate page.
- The date of a note defaults to the current date when created and cannot be manually changed by the user.
- The three-dot action menu is the sole mechanism for destructive actions (delete, discard) in the editing view; there is no swipe-to-delete.
- There is exactly one admin account at launch; the ability to promote a regular user to admin is out of scope.
- The admin does not have a personal notes list; their entry point after login is always the user management page.
- Admin cannot read or access the content of other users' notes (privacy boundary).
