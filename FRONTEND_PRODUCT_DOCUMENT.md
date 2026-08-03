# PowerSense AI - Frontend Product Document

## 1. Product Overview

PowerSense AI is a grid operations console for a power distribution control room.

The product helps an operator answer four questions quickly:

- Where has power gone out?
- How many poles are affected?
- What kind of fault is most likely?
- Is the repair actually confirmed by field telemetry?

The application is built for a non-technical operator sitting in a control room. The operator does not need to understand the algorithm. They only need a clear screen that shows the active incidents, probable location, affected area, confidence, and the next action.

## 2. Simple Explanation Of The PDF Requirement

The assignment asks for a system that can detect electrical faults from pole device signals.

In simple English:

- Every pole may have a device.
- The device only tells whether the pole has power or not.
- If many downstream poles go dark, the system should group them into one incident.
- The system should not create false alarms for scheduled outages, duplicate packets, stale packets, or dead devices.
- Every detected fault should become a ticket.
- The ticket should move through this lifecycle:
  detected -> acknowledged -> crew assigned -> resolved -> verified -> closed.
- The system must not close a ticket just because a user clicks a button.
- Power restoration must be verified by telemetry from the affected poles.
- The frontend must make this understandable for a control room operator.

PowerSense AI is the operator console for this workflow.

## 3. Main Users

- Control room operator: watches the live dashboard, acknowledges incidents, assigns crews, and verifies closure.
- Shift supervisor: checks critical exposure, open incidents, confidence, and restoration status.
- Reviewer or interviewer: uses the simulator to inject faults and confirm the full product flow.
- Field team coordinator: uses the incident details, location, PIN code, and affected pole list to understand where a crew should go.

## 4. Application Structure

This is a single-page application. It does not use separate browser URLs for each page. Instead, it uses five main tabs inside one console.

Main pages:

1. Overview
2. Network map
3. Incidents
4. Live signals
5. Practice lab

Global overlays:

- Incident detail drawer
- Quick actions command palette
- Success and error toast notifications

## 5. Shared Layout Across All Pages

### 5.1 Left Sidebar

The sidebar is always visible on desktop.

From top to bottom:

- PowerSense brand block
- Brand icon: bolt icon
- Product label: OUTAGE INTELLIGENCE
- Sidebar section label: Main views
- Navigation item: Overview
- Navigation item: Network map
- Navigation item: Incidents
- Navigation item: Live signals
- Navigation item: Practice lab
- Connection status card
- Operator profile chip

### 5.2 Sidebar Navigation Items

#### Overview

- Icon: grid icon
- Purpose: opens the main dashboard.
- Click result: changes the active page to Overview.
- API called: no direct API call from the click itself, but the page continues using the 5-second refresh cycle.
- Keyboard shortcut: 1.

#### Network map

- Icon: map icon
- Purpose: opens the visual network view.
- Click result: changes the active page to Network map.
- API called: no direct API call from the click itself, but the map uses the currently loaded transformer and pole data.
- Keyboard shortcut: 2.

#### Incidents

- Icon: alert icon
- Purpose: opens the ticket queue.
- Badge: shows the number of active incidents when active incidents exist.
- Click result: changes the active page to Incidents.
- API called: no direct API call from the click itself.
- Keyboard shortcut: 3.

#### Live signals

- Icon: pulse icon
- Purpose: opens the telemetry packet stream.
- Click result: changes the active page to Live signals.
- API called: no direct API call from the click itself.
- Keyboard shortcut: 4.

#### Practice lab

- Icon: flask icon
- Purpose: opens the fault simulator.
- Click result: changes the active page to Practice lab.
- API called: no direct API call from the click itself.
- Keyboard shortcut: 5.

### 5.3 Connection Status Card

Visible text:

- Connection status
- Everything is running
- Live device connection - 42ms

Visible components:

- Live dot
- Status text
- Progress bar

Purpose:

- Gives the operator confidence that the console is connected.

Current behavior:

- This card is static frontend text.
- It does not currently call a health endpoint directly.

### 5.4 Operator Chip

Visible text:

- Control room
- Operator online

Visible components:

- Avatar with OP text
- Online dot

Purpose:

- Shows that the console is being used as a control room operator.

Current behavior:

- It is a static display.
- Clicking it does not open another page or call an API.

### 5.5 Top Navbar

The top navbar appears above the main content area.

From left to right:

- Breadcrumb: PowerSense -> current page name
- Quick actions button
- Live sync status
- Focus mode button
- Theme toggle button
- Refresh icon button

### 5.6 Top Navbar Items

#### Breadcrumb

Visible text:

- PowerSense
- Current page label, such as Overview or Incidents

Icon:

- Arrow icon between the breadcrumb parts.

Purpose:

- Shows where the user is inside the console.

Click behavior:

- No click action.

#### Quick Actions Button

Visible text:

- Quick actions
- Shortcut hint: Cmd K

Icon:

- Command icon

Click result:

- Opens the command palette popup.

API called:

- No API is called just by opening the palette.

Keyboard result:

- Ctrl K or Cmd K also opens the palette.

#### Live Sync Status

Visible text:

- Live
- Last sync time

Icon:

- Live dot

Purpose:

- Shows that the UI is refreshing from backend data.

Behavior:

- Updates after successful refresh.
- Before first successful load, the sync time shows a dash.

#### Focus Mode Button

Visible text:

- Focus mode
- Changes to Focus on when enabled.

Icon:

- Target icon

Click result:

- Turns focus mode on or off.
- In focus mode, the large dashboard hero panel is hidden so the operator can focus on operational data.

API called:

- No API is called.

#### Theme Toggle Button

Visible text:

- Light when the app is in dark mode.
- Dark when the app is in light mode.

Icon:

- Sun icon when switching to light mode.
- Moon icon when switching to dark mode.

Click result:

- Changes the app between dark and light theme.
- Saves the selected theme in browser local storage.

API called:

- No API is called.

#### Refresh Button

Visible component:

- Refresh icon button.

Click result:

- Reloads dashboard data, transformer data, and pole data.

APIs called:

- GET /api/dashboard
- GET /api/transformers
- GET /api/poles?dt_id={selectedDt}&limit=800

Data fetched:

- Dashboard statistics
- Tickets
- Recent telemetry
- Transformer list
- Poles for the selected transformer

If API succeeds:

- Metrics, tickets, telemetry, map, and last sync time update.

If API fails:

- A red toast appears with "Action needs attention".
- The readable message says the live connection is unavailable if the backend is not responding.

Loading state:

- There is no spinner.
- The page continues showing the current or empty data until refresh finishes.

## 6. Global Data Refresh

When the website opens, the frontend immediately loads data.

It also refreshes automatically every 5 seconds.

APIs called repeatedly:

- GET /api/dashboard
- GET /api/transformers
- GET /api/poles?dt_id={selectedDt}&limit=800

This means the product feels live, but it is not using WebSockets in the current frontend. It is polling the backend every 5 seconds.

## 7. Global Notifications

### 7.1 Success Toast

Visible text:

- Heading: Update complete
- Message depends on the completed action.

Examples:

- Span fault complete - 40 packets - 1 incident
- TKT-12345678 is now Crew assigned
- Restore span complete - 40 packets - 0 incidents - 1 verified

Icon:

- Check icon

Buttons:

- Close button with close icon

Click result:

- Close removes the toast.

API called:

- No API is called by closing the toast.

### 7.2 Error Toast

Visible text:

- Heading: Action needs attention
- Message depends on the failure.

Common messages:

- The live connection is unavailable. Check the API and refresh when it is back online.
- Some affected poles are still without power. Restore the line, wait for a fresh device signal, then try again.
- Something went wrong. Try again in a moment.

Icon:

- Alert icon

Buttons:

- Close button with close icon

Click result:

- Close removes the toast.

API called:

- No API is called by closing the toast.

## 8. Page 1 - Overview

### 8.1 Page Name

Overview

### 8.2 Purpose Of The Page

The Overview page is the control room command center. It gives the operator a fast summary of the grid:

- Active incidents
- Critical faults
- Offline devices
- Poles without power
- Signal health
- Live network map
- Open incident cards
- Recent signal chart
- Transformer focus selector

### 8.3 Who Uses This Page

- Control room operator at the start of a shift
- Supervisor checking overall grid health
- Interviewer or evaluator checking whether the system is understandable at a glance

### 8.4 Complete Layout From Top To Bottom

Top to bottom:

1. Shared sidebar
2. Shared top navbar
3. Hero panel
4. Metric card row
5. Live network view panel
6. Open incidents panel
7. Power signal health chart
8. Transformer focus panel

### 8.5 Hero Panel

Visible text:

- Shift overview - synced {time ago}
- See outages early.
- Restore with confidence.
- PowerSense turns pole signals into a simple response path: find the problem, send a crew, and confirm the repair.

Visible components:

- Live dot
- Main heading
- Supporting paragraph
- See open incidents button
- Try a practice scenario button
- Visual grid pulse graphic
- Signal health value
- Poles without power value
- Sparkline chart

#### Button: See Open Incidents

- Icon: alert icon
- Click result: opens the Incidents page.
- API called: no direct API call from the click.
- Data shown next: the incident queue using dashboard ticket data.
- If API fails: the page can still switch, but data refresh failure appears as an error toast.

#### Button: Try A Practice Scenario

- Icon: spark icon
- Click result: opens the Practice lab page.
- API called: no direct API call from the click.
- Data shown next: simulator scenario cards.

### 8.6 Metric Cards

The Overview page has five metric cards.

#### Card 1: Active Incidents

Visible data:

- Number of active faults
- Detail showing wide-area incident count or "No active response required"

Icon:

- Alert icon

Click result:

- Opens the Incidents page.

API called:

- No direct API call from the click.

Data source:

- GET /api/dashboard
- stats.active_faults
- dashboard tickets

Empty state:

- Shows 0 and "No active response required".

#### Card 2: Critical Exposure

Visible data:

- Number of critical faults
- Detail: "Crew attention required" or "No critical events"

Icon:

- Bolt icon

Click result:

- No click action.

Data source:

- GET /api/dashboard
- stats.critical_faults

#### Card 3: Devices Offline

Visible data:

- Number of offline devices
- Detail showing selected transformer in focus, or "Select a transformer"

Icon:

- Satellite icon

Click result:

- No click action.

Data source:

- GET /api/dashboard
- stats.devices_offline

#### Card 4: Poles Without Power

Visible data:

- Number of dark poles
- Detail showing the number of poles in the selected transformer slice, or "Network wide"

Icon:

- Map icon

Click result:

- No click action.

Data source:

- GET /api/dashboard
- stats.affected_poles
- GET /api/transformers for selected transformer pole_count

#### Card 5: Signal Continuity

Visible data:

- Clean signal percentage
- Detail: "{percentage}% packets applied cleanly"

Icon:

- Pulse icon

Click result:

- No click action.

Data source:

- GET /api/dashboard
- recent_telemetry

Calculation:

- Clean packets are packets that are not duplicate and not stale.

### 8.7 Live Network View Panel

Visible text:

- Where power is flowing
- Live network view
- Open full map

Visible components:

- Map panel
- Live/dark/no-device/fault legend
- Transformer marker
- Pole nodes
- Fault markers
- Compass
- Pole count in view

#### Button: Open Full Map

- Icon: arrow icon
- Click result: opens the Network map page.
- API called: no direct API call from the click.

#### Pole Nodes

Colors:

- Green node: live pole
- Red node: dark pole
- Gray node: pole has no device

Click result:

- Selects the pole.
- In the Overview page, there is no selected-node side panel, so the selection is mainly reflected by highlighting the node.

API called:

- No API is called.

#### Transformer Node

Icon:

- Bolt icon

Click result:

- Selects the transformer as a node.

API called:

- No API is called.

#### Fault Node

Icon:

- Alert icon

Click result:

- Opens the incident detail drawer for that ticket.

API called:

- No API is called when opening the drawer because the ticket data is already loaded from the dashboard.

### 8.8 Open Incidents Panel

Visible text:

- Needs a response
- Open incidents
- {count} open

Visible components:

- Up to four incident cards
- Empty state if no active incidents
- See all open incidents link if more than four incidents exist

#### Incident Card

Each incident card shows:

- Fault type
- Ticket ID
- Detected time relative to now
- Status badge
- AI/generated summary
- Restoration strip
- Localization level
- Affected pole count
- Confidence meter

Icons:

- Bolt icon for span fault
- Radio icon for feeder fault
- Shield icon for transformer fault
- Target icon for location level
- Users icon for affected pole count
- Check icon when restoration is ready or verified
- Wrench icon when restoration is still waiting

Click result:

- Opens the incident detail drawer.

API called:

- No API is called when opening the drawer.

Empty state:

- Shows "Everything looks good."
- Shows "No open incidents need a crew right now."
- Icon: check icon

#### Link: See All Open Incidents

- Icon: arrow icon
- Visible only when more than four active incidents exist.
- Click result: opens the Incidents page.
- API called: no direct API call.

### 8.9 Power Signal Health Panel

Visible text:

- Recent device messages
- Power signal health
- Legend: Power on, Power off
- Axis: 5 minutes ago, Now

Chart:

- Sparkline chart based on recent telemetry.

Data source:

- GET /api/dashboard
- recent_telemetry

Empty state:

- Shows "Waiting for device messages"
- Shows "The chart will fill as poles report their power state."
- Icon: radio icon

Click behavior:

- No interactive action.

### 8.10 Transformer Focus Panel

Visible text:

- Choose what to inspect
- Selected transformer ID
- Verified layout or Estimated layout badge
- Focus mode explanation

Visible components:

- Transformer dropdown
- Feeder fact card
- Capacity fact card
- Homes served fact card
- Focus mode note
- Turn on / On button

#### Dropdown: Choose Transformer

Options:

- Each option shows transformer ID and feeder ID.

Click/change result:

- Changes the selected transformer.
- Clears the selected pole.
- The next refresh loads poles for the selected transformer.

API called:

- On the next refresh:
  - GET /api/poles?dt_id={selectedDt}&limit=800

Data fetched:

- Poles under the selected transformer.

Empty state:

- If no transformer is selected, shows "Choose a transformer to see its poles, devices, and power status."

#### Button: Turn On / On

- Icon near note: spark icon
- Click result: toggles focus mode.
- API called: no API call.
- Screen change: hides or shows the large hero area.

### 8.11 Overview Loading State

- Before first load, the hero says "connecting".
- Metrics show safe default values such as 0 or 100%.
- The map may show "No network slice loaded" until poles are loaded.
- There is no spinner.

### 8.12 Overview Error State

If dashboard or transformer data fails:

- Red error toast appears.
- The message tells the user the live connection is unavailable.

If poles fail but dashboard and transformer calls work:

- The map keeps the previous pole data or stays empty.

## 9. Page 2 - Network Map

### 9.1 Page Name

Network map

### 9.2 Purpose Of The Page

The Network map page helps the operator inspect the physical network visually.

It shows:

- Pole locations
- Live poles
- Dark poles
- Missing devices
- Transformer anchor
- Active incident markers
- Selected node details

### 9.3 Who Uses This Page

- Operator checking where an outage boundary is located
- Supervisor checking if a fault is span-level, transformer-level, or feeder-level
- Interviewer watching the fault appear after simulation

### 9.4 Complete Layout From Top To Bottom

Top to bottom:

1. Shared sidebar
2. Shared top navbar
3. Page heading
4. Schematic mode badge
5. Refresh map button
6. Main map panel
7. Selected node side panel

### 9.5 Page Heading

Visible text:

- Geospatial operations
- Network map
- Trace energized paths, missing sensors, and probable fault boundaries.

### 9.6 Badge: Schematic Mode

Visible text:

- Schematic mode

Icon:

- Live dot

Purpose:

- Tells the user this is a schematic/geospatial approximation, not a full map-tile product.

Click behavior:

- No click action.

### 9.7 Button: Refresh Map

- Icon: refresh icon
- Click result: reloads dashboard, transformers, and selected transformer poles.

APIs called:

- GET /api/dashboard
- GET /api/transformers
- GET /api/poles?dt_id={selectedDt}&limit=800

If API succeeds:

- Map nodes, incident markers, and selected transformer data update.

If API fails:

- Red error toast appears.

### 9.8 Main Map Panel

Visible components:

- Grid background
- Header: Live network view
- Selected transformer ID
- Count of poles in view
- Line connections between parent and child poles when topology is known
- Pole nodes
- Transformer node
- Fault nodes
- Legend
- Compass

#### Legend

Legend items:

- Live
- Dark
- No device
- Incident

Purpose:

- Helps the operator understand node colors.

#### Pole Node

Visible style:

- Green: energized pole
- Red: dark pole
- Gray: no device installed

Click result:

- Selects the pole.
- The side panel updates with node details.

API called:

- No API call.

Screen changes:

- The selected node is highlighted on the map.
- Side panel shows feeder, DT/ward, device, and last signal.

#### Transformer Node

Visible style:

- Larger yellow marker with bolt icon.

Click result:

- Selects the transformer.
- Side panel shows it as a distribution transformer.

API called:

- No API call.

#### Fault Node

Visible style:

- Orange/red circular incident marker with alert icon.
- It pulses to catch attention.

Click result:

- Opens the incident detail drawer.

API called:

- No API call.

### 9.9 Selected Node Side Panel

Default empty state:

- "Click a node to inspect it"
- "Use the map as a fast spatial index into your network."
- Icon: target icon

When a node is selected, visible data:

- Pole ID or transformer ID
- Node type:
  - Distribution transformer
  - Energized pole
  - Dark pole
- Feeder
- DT / Ward
- Device ID or "Not installed"
- Last signal
- Short node note

Icons:

- Bolt icon for transformer
- Target icon for pole
- Spark icon for explanation note

Click behavior:

- The panel itself has no buttons.

### 9.10 Map Empty State

If no poles are available:

- Shows "No network slice loaded"
- Shows "Select a transformer to focus the map."
- Icon: map icon

### 9.11 Map Error State

If refresh fails:

- Red toast appears.
- Existing map data remains if it was already loaded.

## 10. Page 3 - Incidents

### 10.1 Page Name

Incidents

### 10.2 Purpose Of The Page

The Incidents page is the ticket queue. It is where the operator manages the incident lifecycle.

The page helps the operator:

- See all active and historical incidents
- Search for a ticket, transformer, or PIN code
- Filter by fault type
- Acknowledge an incident
- Assign a crew
- Verify a repair only after telemetry says power is back
- Open the full incident detail drawer

### 10.3 Who Uses This Page

- Control room operator
- Shift supervisor
- Dispatcher or field coordination team

### 10.4 Complete Layout From Top To Bottom

Top to bottom:

1. Shared sidebar
2. Shared top navbar
3. Page heading
4. Active incident count
5. Operational queue panel
6. Search field
7. Filter dropdown
8. Queue guide
9. Incident table
10. Empty state if no matching incidents
11. Incident drawer when a row is opened

### 10.5 Page Heading

Visible text:

- Human-in-the-loop workflow
- Incident queue
- Prioritize what needs a crew now, with evidence attached.

Right side stat:

- Number of active incidents

### 10.6 Operational Queue Panel

Visible text:

- Operational queue
- Every incident, one clear next action.

### 10.7 Search Field

Placeholder:

- Search ticket, transformer or PIN

Icon:

- Search icon

User action:

- User types a ticket ID, fault type, PIN code, or transformer ID.

Result:

- Table filters instantly on the frontend.

API called:

- No API call.

Empty state:

- If no rows match, the table shows "No incidents match this view."

### 10.8 Filter Dropdown

Options:

- Open incidents
- All incidents
- Span faults
- Transformer faults
- Feeder faults

User action:

- User selects a filter.

Result:

- Table updates instantly on the frontend.

API called:

- No API call.

### 10.9 Queue Guide Card

Visible text:

- Start with the highest-impact incident.
- Open a row to see the probable fault location and evidence. A repair is only verified after every affected pole reports power.

Icon:

- Spark icon

Purpose:

- Teaches the operator the correct workflow without requiring training material.

### 10.10 Incident Table

Columns:

1. Incident
2. Location
3. Impact
4. Confidence
5. Status
6. Next action

#### Column: Incident

Shows:

- Ticket ID
- Fault type
- Detected date and time

Icon:

- Fault icon with color based on fault type.

#### Column: Location

Shows:

- DT ID or feeder ID
- Localization level:
  - Exact span
  - Transformer area
  - Whole feeder
- PIN code if available

#### Column: Impact

Shows:

- Number of affected poles
- Restoration status:
  - Restoration verified
  - Ready to verify
  - X poles are still dark
  - Waiting for restoration telemetry

#### Column: Confidence

Shows:

- Confidence percentage in a circular badge
- Text:
  - High confidence when confidence is 80% or higher
  - Review boundary when confidence is below 80%

#### Column: Status

Shows a status pill:

- Detected
- Acknowledged
- Crew assigned
- Resolved
- Verified
- Closed

#### Column: Next Action

Buttons:

- Acknowledge
- Assign crew
- Verify repair or Waiting for power

### 10.11 Button: Acknowledge

Visible when:

- Present on every row, but enabled only when ticket status is detected.

Click result:

- Updates the ticket to acknowledged.
- Shows success toast.
- Refreshes dashboard data.

API called:

- PATCH /api/tickets/{ticket_id}/status

Request body:

```json
{ "status": "acknowledged" }
```

Data changed:

- Ticket status becomes acknowledged.
- acknowledged_at timestamp is set.

If API fails:

- Error toast appears.

Loading state:

- No spinner.
- The action completes after the backend responds.

### 10.12 Button: Assign Crew

Visible when:

- Present on every row, but enabled when ticket status is detected or acknowledged.

Click result:

- Updates the ticket to crew assigned.
- Shows success toast.
- Refreshes dashboard data.

API called:

- PATCH /api/tickets/{ticket_id}/status

Request body:

```json
{ "status": "crew_assigned" }
```

Data changed:

- Ticket status becomes crew_assigned.
- crew_assigned_at timestamp is set.

If API fails:

- Error toast appears.

### 10.13 Button: Verify Repair

Visible label:

- Verify repair when all affected poles are live.
- Waiting for power when the repair cannot yet be verified.

Enabled when:

- Ticket is not verified or closed.
- All affected poles are energized.

Click result:

- Asks the backend to mark the ticket resolved.
- Backend immediately verifies it if telemetry confirms all affected poles are live.
- Status becomes verified.
- Shows success toast.
- Refreshes dashboard data.

API called:

- PATCH /api/tickets/{ticket_id}/status

Request body:

```json
{ "status": "resolved" }
```

If poles are still dark:

- Backend returns a blocked response.
- UI shows an error toast.
- Ticket does not become verified.

Error message:

- Some affected poles are still without power. Restore the line, wait for a fresh device signal, then try again.

### 10.14 Table Row Click

Click result:

- Opens the incident detail drawer.

API called:

- No API call because dashboard data already contains the ticket details.

### 10.15 Incidents Empty State

When no ticket matches search/filter:

- Icon: search icon
- Text: No incidents match this view.
- Text: Try a different filter or run a scenario from the lab.

### 10.16 Incidents Error State

If ticket status update fails:

- Red error toast appears.

If dashboard refresh fails:

- Red error toast appears.

## 11. Page 4 - Live Signals

### 11.1 Page Name

Live signals

### 11.2 Purpose Of The Page

The Live signals page shows the recent telemetry packet stream.

It helps the operator or reviewer confirm:

- Which pole sent a message
- Which device sent it
- Whether the event was power lost, power restored, heartbeat, or boot
- Whether the pole is energized or dark
- Whether the packet was applied, duplicate, or stale

### 11.3 Who Uses This Page

- Operator checking recent field messages
- Engineer or reviewer validating ingestion behavior
- Interviewer testing duplicate and delayed message scenarios

### 11.4 Complete Layout From Top To Bottom

Top to bottom:

1. Shared sidebar
2. Shared top navbar
3. Page heading
4. Clean signal rate stat
5. Signal stream table panel
6. Ingesting live badge
7. Search field
8. Telemetry summary row
9. Telemetry table
10. Empty state if no telemetry matches

### 11.5 Page Heading

Visible text:

- Device observability
- Signal stream
- Every packet is auditable, deduplicated, and classified before it changes state.

Right side stat:

- Clean signal rate percentage

### 11.6 Ingesting Live Badge

Visible text:

- Ingesting live

Icon:

- Live dot

Purpose:

- Shows that the stream is active.

Current behavior:

- It is a visual badge. The actual data updates through the 5-second polling refresh.

### 11.7 Search Field

Placeholder:

- Search pole or device

Icon:

- Search icon

User action:

- User types a pole ID, device ID, or event name.

Result:

- The telemetry table filters instantly on the frontend.

API called:

- No API call.

### 11.8 Telemetry Summary Row

Shows:

- Number of clean packets
- Number of duplicates quarantined
- Number of stale packets ignored

Data source:

- GET /api/dashboard
- recent_telemetry

### 11.9 Telemetry Table

Columns:

1. Received
2. Source
3. Event
4. Power state
5. Sequence
6. Quality

#### Column: Received

Shows:

- Time the packet was received
- Relative time such as "10s ago"

#### Column: Source

Shows:

- Pole ID
- Device ID

#### Column: Event

Shows event chip:

- Power Lost
- Power Restored
- Heartbeat
- Boot

Icon/color purpose:

- Danger style for power lost
- Success style for power restored
- Neutral style for heartbeat or boot

#### Column: Power State

Shows:

- Energized
- Dark

Visual:

- Small dot using live/dark color.

#### Column: Sequence

Shows:

- Packet sequence number, for example #12.

Purpose:

- Helps prove duplicate and stale packet handling.

#### Column: Quality

Shows quality chip:

- Applied
- Duplicate
- Stale

Purpose:

- Shows whether the backend used the packet to change state.

### 11.10 Live Signals Empty State

When no telemetry rows match:

- Icon: radio icon
- Text: No telemetry found.
- Text: Live packets will appear here as the simulator or devices report in.

### 11.11 Live Signals Error State

If dashboard refresh fails:

- Red error toast appears.

### 11.12 Page Type

This page is view-only.

The user cannot modify backend data from this page.

## 12. Page 5 - Practice Lab

### 12.1 Page Name

Practice lab

### 12.2 Purpose Of The Page

The Practice lab is the fault simulator.

It lets the reviewer or operator inject test scenarios and watch the system detect, ticket, repair, and verify incidents.

### 12.3 Who Uses This Page

- Interviewer or evaluator
- Developer during demo
- Control room trainer
- Operator practicing the incident workflow

### 12.4 Complete Layout From Top To Bottom

Top to bottom:

1. Shared sidebar
2. Shared top navbar
3. Page heading
4. Scenario count stat
5. Scenario panel
6. Create a power problem section
7. Bring power back section
8. Test messy device messages section
9. Response guide panel

Note:

- The page heading shows "8 safe scenarios".
- The visible simulator cards currently total 10:
  - 3 fault cards
  - 3 repair cards
  - 4 noise cards

### 12.5 Page Heading

Visible text:

- Operator training
- Scenario lab
- Practice the response loop without touching a real field device.

Right side stat:

- 8 safe scenarios

### 12.6 Scenario Panel

Visible text:

- Practice safely
- Try a scenario and watch the grid respond.
- Ready to try
- These actions create realistic device messages. Use them to learn the full response: find the problem, send a crew, repair the line, and confirm power is back.

Icon:

- Spark icon in the Ready to try badge

### 12.7 Section: Create A Power Problem

#### Button: Span Fault

Visible description:

- Break a single downstream span and localize the boundary.

Icon:

- Bolt icon

Click result:

- Injects a span fault for the selected transformer.
- Creates power_lost telemetry for downstream poles.
- Backend localizes the likely fault boundary.
- A ticket is created or updated.
- UI shows success toast.
- Dashboard refreshes.
- The new incident appears in Overview, Incidents, and Map.

API called:

- POST /api/simulate/span-fault

Request body:

```json
{
  "dt_id": "selected transformer id",
  "from_seq": 5
}
```

Data fetched/changed:

- Pole states become dark for the affected segment.
- Telemetry records are created.
- Ticket is created with fault type span.

If API fails:

- Error toast appears.

Loading state:

- Scenario buttons are disabled while the request is running.

Disabled state:

- Disabled if no transformer is selected.

#### Button: Transformer Outage

Visible description:

- Darken every observed pole behind one transformer.

Icon:

- Shield icon

Click result:

- Injects a transformer-level outage for the selected transformer.
- Creates power_lost telemetry for poles under that transformer.
- Backend creates a transformer fault ticket.
- UI refreshes and shows the incident.

API called:

- POST /api/simulate/transformer-fault

Request body:

```json
{
  "dt_id": "selected transformer id"
}
```

#### Button: Feeder Outage

Visible description:

- Exercise wide-area grouping and criticality ranking.

Icon:

- Radio icon

Click result:

- Injects a feeder-level outage.
- Creates power_lost telemetry for poles on the selected feeder.
- Backend creates a feeder fault ticket if the pattern is valid.
- UI refreshes.

API called:

- POST /api/simulate/feeder-fault

Request body:

```json
{
  "feeder_id": "selected feeder id"
}
```

Disabled state:

- Disabled if no feeder is available.

### 12.8 Section: Bring Power Back

#### Button: Restore Span

Visible description:

- Send restoration telemetry for the selected segment.

Icon:

- Wrench icon

Click result:

- Sends power_restored telemetry for the selected span segment.
- Backend checks whether related tickets can be verified.
- If all affected poles are live, ticket status becomes verified.
- UI shows success toast and refreshes.

API called:

- POST /api/simulate/repair

Request body:

```json
{
  "dt_id": "selected transformer id",
  "from_seq": 5
}
```

#### Button: Restore Transformer

Visible description:

- Bring every pole behind the selected transformer live.

Icon:

- Check icon

Click result:

- Sends restoration telemetry for the selected transformer area.
- Backend verifies related tickets when all affected poles are live.

API called:

- POST /api/simulate/repair

Request body:

```json
{
  "scope": "transformer",
  "dt_id": "selected transformer id"
}
```

#### Button: Restore Feeder

Visible description:

- Verify the wide-area restoration workflow.

Icon:

- Check icon

Click result:

- Sends restoration telemetry for the feeder.
- Backend verifies feeder-level tickets when all affected poles are live.

API called:

- POST /api/simulate/repair

Request body:

```json
{
  "scope": "feeder",
  "feeder_id": "selected feeder id"
}
```

### 12.9 Section: Test Messy Device Messages

#### Button: Scheduled Outage

Visible description:

- Prove planned work does not create a false ticket.

Icon:

- Clock icon

Click result:

- Creates a scheduled outage window.
- Sends dark telemetry for the selected transformer.
- Backend suppresses fault detection for the scheduled outage.
- UI shows a success toast.
- Telemetry appears, but a false incident should not be created.

API called:

- POST /api/simulate/scheduled-outage

Request body:

```json
{
  "dt_id": "selected transformer id"
}
```

#### Button: Kill A Device

Visible description:

- Separate a silent sensor from a genuinely dark pole.

Icon:

- Satellite icon

Click result:

- Marks a device as last seen long ago.
- Device offline count can increase.
- No fault ticket should be created just because a device is silent.

API called:

- POST /api/simulate/kill-device

Request body:

```json
{}
```

#### Button: Duplicate Packet

Visible description:

- Quarantine the same sequence without changing pole state.

Icon:

- Copy icon

Click result:

- Generates a telemetry packet with the same sequence number as the latest known packet.
- Backend marks it as duplicate.
- Telemetry table shows quality as Duplicate.
- Pole state should not change.

API called:

- POST /api/simulate/duplicate-message

Request body:

```json
{}
```

#### Button: Delayed Packet

Visible description:

- Ignore old telemetry while retaining an audit trail.

Icon:

- Radio icon

Click result:

- Generates an old telemetry packet.
- Backend marks it as stale.
- Telemetry table shows quality as Stale.
- Pole state should not change.

API called:

- POST /api/simulate/delayed-message

Request body:

```json
{}
```

### 12.10 Response Guide Panel

Visible text:

- Response guide
- Three steps to close an incident
- 03

Steps:

1. Find it
   A power change becomes one grouped incident.

2. Send help
   Acknowledge the issue and assign a crew.

3. Confirm it
   Close only after live messages show power is back.

Callout:

- Clear and explainable
- The system calculates the fault location; AI only writes the summary.

Icon:

- Shield icon

### 12.11 Practice Lab Loading State

When a scenario request is running:

- All scenario cards are disabled.
- There is no spinner.
- A success or error toast appears after the request finishes.

### 12.12 Practice Lab Empty State

There is no separate empty state for this page.

If no transformer or feeder exists:

- Related scenario buttons become disabled.

### 12.13 Practice Lab Error State

If any simulator API fails:

- Red error toast appears.
- The visible data does not update.

## 13. Global Modal 1 - Incident Detail Drawer

### 13.1 Modal Name

Incident detail drawer

### 13.2 Purpose

The drawer gives the operator the full incident brief without leaving the current page.

It is opened from:

- Overview incident card
- Overview fault node
- Network map fault node
- Incidents table row

### 13.3 Layout From Top To Bottom

1. Drawer header
2. Close button
3. Fault hero row
4. Status pill
5. Stage rail
6. Restoration banner
7. Summary
8. Detail grid
9. Confidence explanation
10. Affected poles
11. Action buttons
12. Closure rule note

### 13.4 Drawer Header

Visible text:

- Incident brief
- Ticket ID

Button:

- Close incident details

Icon:

- Close icon

Click result:

- Drawer closes.

API called:

- No API call.

### 13.5 Fault Hero Row

Shows:

- Fault type
- Detected time
- Current status badge

Icons:

- Bolt icon for span fault
- Alert icon for transformer or feeder in drawer hero

### 13.6 Stage Rail

Stages shown:

1. Detected
2. Acknowledged
3. Crew assigned
4. Resolved
5. Verified

Purpose:

- Shows where the ticket is in the workflow.

Behavior:

- Completed stages show a check icon.
- Current stage is highlighted.

### 13.7 Restoration Banner

Possible states:

- Restoration verified
- Ready to verify
- X poles are still dark
- Waiting for restoration telemetry

Icons:

- Check icon when ready or verified
- Wrench icon when waiting

Purpose:

- Explains whether the ticket can move toward closure.

### 13.8 Summary

Shows:

- Generated incident summary or confidence reason.

Purpose:

- Gives the operator plain-English context.

Product note:

- The UI uses AI/generated summary language for explanation.
- Fault location itself is not decided by AI; it is based on deterministic grid state and telemetry.

### 13.9 Detail Grid

Fields:

- Fault location
- Confidence
- Poles without power
- PIN code
- Last live pole
- First dark pole

Purpose:

- Gives the operator dispatch-ready information.

### 13.10 Confidence Section

Visible text:

- Why the engine is confident
- Confidence percentage
- Confidence bar
- Confidence reason

Purpose:

- Explains whether the operator should trust the location or review it.

### 13.11 Affected Poles Section

Visible data:

- Up to 18 affected pole IDs.
- If there are more than 18, shows "+X more".

Purpose:

- Shows the downstream poles grouped under one incident.

### 13.12 Drawer Action Buttons

#### Button: Acknowledge

- Enabled only when status is detected.
- API: PATCH /api/tickets/{ticket_id}/status
- Body: { "status": "acknowledged" }
- Result: ticket becomes acknowledged.

#### Button: Assign Crew

- Enabled when status is detected or acknowledged.
- API: PATCH /api/tickets/{ticket_id}/status
- Body: { "status": "crew_assigned" }
- Result: ticket becomes crew assigned.

#### Button: Verify Restoration

- Enabled only when all affected poles are live.
- API: PATCH /api/tickets/{ticket_id}/status
- Body: { "status": "resolved" }
- Result: backend marks the ticket verified if telemetry confirms restoration.
- If poles are still dark: backend blocks it and UI shows error toast.

#### Button: Close Ticket

- Visible only when ticket status is verified.
- Icon: shield icon
- API: PATCH /api/tickets/{ticket_id}/status
- Body: { "status": "closed" }
- Result: ticket becomes closed.
- If ticket is not verified: backend blocks closure.

### 13.13 Drawer Backdrop

Click result:

- Clicking outside the drawer closes it.

API called:

- No API call.

### 13.14 Keyboard Behavior

- Pressing Escape closes the drawer.

## 14. Global Modal 2 - Command Palette

### 14.1 Modal Name

Quick actions command palette

### 14.2 Purpose

The command palette lets a power user quickly jump to pages or run a demo command.

### 14.3 Opens From

- Quick actions button in the top navbar
- Ctrl K or Cmd K keyboard shortcut

### 14.4 Layout

Top to bottom:

1. Search field
2. ESC hint
3. Quick actions label
4. Command list

### 14.5 Search Field

Placeholder:

- Jump to a view or run a command...

Icon:

- Search icon

Current behavior:

- The field is visible and focused.
- It does not currently filter commands.

### 14.6 Commands

#### Command: Open command center

- Icon: grid icon
- Hint: 1
- Click result: opens Overview.
- API called: none.

#### Command: Open incident queue

- Icon: alert icon
- Hint: 3
- Click result: opens Incidents.
- API called: none.

#### Command: Inspect network map

- Icon: map icon
- Hint: 2
- Click result: opens Network map.
- API called: none.

#### Command: Inject span fault

- Icon: bolt icon
- Hint: demo
- Click result: runs a span fault simulation for the selected transformer.
- API called: POST /api/simulate/span-fault
- Body: { "dt_id": selected transformer, "from_seq": 5 }
- Result: creates telemetry and a ticket, then refreshes the UI.

#### Command: Open scenario lab

- Icon: flask icon
- Hint: 5
- Click result: opens Practice lab.
- API called: none.

### 14.7 Close Behavior

- Click outside the palette closes it.
- Press Escape closes it.
- Clicking any command closes it after action starts.

## 15. Status Badges And Chips

### 15.1 Ticket Status Pills

Statuses:

- Detected
- Acknowledged
- Crew assigned
- Resolved
- Verified
- Closed

Purpose:

- Shows the current ticket lifecycle stage.

### 15.2 Restoration Badges

States:

- Ready to verify
- Waiting for restoration telemetry
- X poles are still dark
- Restoration verified

Purpose:

- Shows whether power has returned according to telemetry.

### 15.3 Topology Badge

Values:

- Verified layout
- Estimated layout

Purpose:

- Tells whether the selected transformer has known pole ordering.
- Verified layout means exact span localization is more likely.
- Estimated layout means the product may only show an approximate transformer-area location.

### 15.4 Map Mode Badge

Value:

- Schematic mode

Purpose:

- Tells the user the network view is schematic.

### 15.5 Lab Badge

Value:

- Ready to try

Purpose:

- Shows simulator actions are available.

### 15.6 Stream Badge

Value:

- Ingesting live

Purpose:

- Shows telemetry stream is active.

### 15.7 Event Chips

Values:

- Power Lost
- Power Restored
- Heartbeat
- Boot

Purpose:

- Classifies telemetry events.

### 15.8 Quality Chips

Values:

- Applied
- Duplicate
- Stale

Purpose:

- Shows whether the telemetry changed system state.

### 15.9 Power State Label

Values:

- Energized
- Dark

Purpose:

- Shows whether the pole currently has power.

## 16. Icon List And Purpose

- Grid icon: Overview/dashboard.
- Map icon: network view, transformer selector, map empty state.
- Alert icon: incidents, fault markers, error messages.
- Pulse icon: telemetry/live signals and signal continuity.
- Flask icon: simulator/practice lab.
- Command icon: quick actions palette.
- Refresh icon: reload data.
- Arrow icon: open another page, move forward, map compass.
- Chevron icon: dropdown indicator.
- Copy icon: duplicate packet simulation.
- Bolt icon: electricity, span fault, brand mark, critical exposure, transformer marker.
- Shield icon: transformer fault, trusted/verified workflow, close ticket.
- Users icon: affected poles and crew assignment.
- Clock icon: scheduled outage and time context.
- Close icon: close drawer, toast, or popup.
- Search icon: search inputs and no-match empty states.
- Check icon: success, completed stage, verified repair.
- Target icon: focus mode, exact location, selected node.
- Satellite icon: offline device and kill device scenario.
- Spark icon: AI/generated summary, scenario readiness, helper guidance.
- Wrench icon: repair workflow and waiting-for-power state.
- Radio icon: feeder fault, telemetry stream, delayed packet.
- Sun icon: switch to light mode.
- Moon icon: switch to dark mode.
- Live dot: active connection, live sync, live map count.
- Online dot: operator online.
- Status dot: ticket status pill marker.

## 17. Complete User Journey

### 17.1 Opening The Website

1. User opens PowerSense AI.
2. The app shows the Overview page.
3. The app loads dashboard, transformer, and pole data.
4. The sidebar shows the five main views.
5. The topbar shows live sync status.
6. If the backend is available, metrics and map appear.
7. If the backend is unavailable, a red error toast appears.

### 17.2 Normal Monitoring Journey

1. Operator starts on Overview.
2. Operator checks active incidents and poles without power.
3. Operator checks the Open incidents panel.
4. If an incident exists, operator clicks the card.
5. The incident drawer opens.
6. Operator reads fault type, location, confidence, PIN code, and affected poles.
7. Operator clicks Acknowledge.
8. Operator clicks Assign crew.
9. Operator waits for restoration telemetry.
10. When all affected poles report live, the UI says Ready to verify.
11. Operator clicks Verify restoration.
12. The backend verifies the ticket from telemetry.
13. Operator closes the ticket when verified.

### 17.3 Demo Or Interview Journey

1. Open the Practice lab.
2. Click Span fault.
3. Watch the success toast show telemetry packets and incident count.
4. Open Overview.
5. See active incident count increase.
6. Open Network map.
7. See dark poles and incident marker.
8. Open Incidents.
9. Open the ticket drawer.
10. Explain the affected poles, confidence, location level, and status.
11. Acknowledge the ticket.
12. Assign crew.
13. Go back to Practice lab.
14. Click Restore span.
15. Return to Incidents.
16. See ticket ready or already verified.
17. Close the ticket if verified.

### 17.4 Leaving The Website

There is no logout flow.

The user can simply close the browser tab.

Theme preference remains saved in local storage.

## 18. Navigation Flow Between Pages

Navigation methods:

- Sidebar clicks
- Keyboard keys 1 to 5
- Command palette
- Hero buttons
- Dashboard panel links
- Incident cards and fault nodes open the drawer, not a new page

Flow:

- Overview -> Incidents by clicking See open incidents or Active incidents metric.
- Overview -> Practice lab by clicking Try a practice scenario.
- Overview -> Network map by clicking Open full map.
- Network map -> Incident drawer by clicking a fault node.
- Incidents -> Incident drawer by clicking a table row.
- Practice lab -> Overview/Incidents/Map by sidebar or command palette after running a scenario.
- Any page -> Quick actions popup by clicking Quick actions or pressing Ctrl/Cmd K.

## 19. Real-Time, Static, Fetching, Modifying, And View-Only Pages

### 19.1 Features That Depend On Real-Time Updates

These depend on the 5-second polling refresh:

- Active incident count
- Critical exposure count
- Devices offline count
- Poles without power count
- Signal continuity
- Open incident cards
- Incident table status
- Map pole live/dark state
- Fault markers
- Telemetry table
- Restoration readiness

### 19.2 Static Areas

These are mostly static frontend content:

- Sidebar labels
- Product brand text
- Hero headline and support copy
- Connection status card text
- Operator chip
- Page headings
- Queue guide text
- Practice lab playbook
- Scenario card labels and descriptions

### 19.3 Pages That Fetch Backend Data

- Overview
- Network map
- Incidents
- Live signals
- Practice lab indirectly uses selected transformer/feeder data

### 19.4 Pages That Modify Backend Data

- Incidents page modifies ticket status.
- Practice lab modifies backend state by creating simulated faults, repairs, scheduled outages, dead devices, duplicate messages, and delayed messages.

### 19.5 Pages That Are Only For Viewing

- Live signals is view-only.
- Network map is view-only except for selecting nodes and opening ticket details.
- Overview is mostly view-only, except it allows transformer selection, focus mode, navigation, and opening ticket details.

## 20. Complete Page Hierarchy

```text
PowerSense AI
  Global App Shell
    Sidebar
      Brand
      Overview
      Network map
      Incidents
      Live signals
      Practice lab
      Connection status
      Operator chip
    Topbar
      Breadcrumb
      Quick actions
      Live sync
      Focus mode
      Theme toggle
      Refresh
    Toast notification
    Incident detail drawer
    Command palette

  Overview
    Hero panel
    Metric cards
    Live network view panel
    Open incidents panel
    Power signal health panel
    Transformer focus panel

  Network map
    Page heading
    Schematic mode badge
    Refresh map button
    Schematic map
    Selected node panel

  Incidents
    Page heading
    Active incident stat
    Search field
    Filter dropdown
    Queue guide
    Incident table
    Incident detail drawer

  Live signals
    Page heading
    Clean signal rate stat
    Ingesting live badge
    Search field
    Telemetry summary
    Telemetry table

  Practice lab
    Page heading
    Scenario cards
    Power problem simulations
    Repair simulations
    Noise simulations
    Response guide
```

## 21. Complete Feature List

- Live operations overview
- Active incident count
- Critical exposure count
- Offline device count
- Dark pole count
- Signal continuity percentage
- Schematic network map
- Transformer selector
- Known topology vs estimated topology badge
- Pole status visualization
- Missing device visualization
- Active fault marker visualization
- Incident cards
- Incident search
- Incident filter dropdown
- Incident lifecycle table
- Ticket detail drawer
- Ticket acknowledgement
- Crew assignment
- Telemetry-based repair verification
- Ticket closure after verification
- Recent telemetry stream
- Duplicate packet visibility
- Stale packet visibility
- Power lost/restored visibility
- Fault simulator
- Span fault simulation
- Transformer outage simulation
- Feeder outage simulation
- Span restoration simulation
- Transformer restoration simulation
- Feeder restoration simulation
- Scheduled outage simulation
- Dead device simulation
- Duplicate packet simulation
- Delayed packet simulation
- Success and error toasts
- Command palette
- Keyboard navigation
- Focus mode
- Dark and light theme
- Responsive layout for smaller screens

## 22. Complete Frontend Flow

### 22.1 Initial Load Flow

1. App opens on Overview.
2. App reads saved theme from browser local storage.
3. App calls dashboard and transformer APIs.
4. App selects the first transformer if no transformer is selected.
5. App calls poles API for the selected transformer.
6. App calculates active tickets and signal continuity.
7. App renders metrics, map, incidents, telemetry trend, and focus selector.
8. App starts a 5-second refresh loop.

### 22.2 Fault Detection Display Flow

1. A fault is simulated or telemetry arrives.
2. Backend updates pole power states.
3. Backend creates or updates a ticket.
4. Frontend refreshes.
5. Overview metrics update.
6. Map nodes turn dark.
7. Fault marker appears.
8. Incident appears in the Open incidents panel and Incidents table.
9. Operator opens the incident drawer.

### 22.3 Ticket Workflow Flow

1. Ticket starts as Detected.
2. Operator clicks Acknowledge.
3. Ticket becomes Acknowledged.
4. Operator clicks Assign crew.
5. Ticket becomes Crew assigned.
6. Repair telemetry arrives from simulator or devices.
7. Backend checks all affected poles.
8. If all are live, ticket can become Verified.
9. Operator closes the verified ticket.

### 22.4 Repair Block Flow

1. Operator tries to verify a repair.
2. Backend checks affected poles.
3. If some poles are still dark, backend blocks the action.
4. UI shows an error toast.
5. Ticket remains open.
6. Operator waits for restoration telemetry or runs repair scenario.

## 23. API Calls Grouped Page-Wise

### 23.1 Global Calls Used By All Main Pages

#### GET /api/dashboard

Used by:

- Overview
- Network map
- Incidents
- Live signals
- Practice lab indirectly

Purpose:

- Loads the main operations data.

Data returned:

- stats.active_faults
- stats.critical_faults
- stats.devices_offline
- stats.affected_poles
- stats.transformers
- stats.average_detection_seconds
- stats.average_resolution_minutes
- tickets
- recent_telemetry

Failure behavior:

- Shows error toast.

#### GET /api/transformers

Used by:

- Overview focus panel
- Network map
- Practice lab selected DT/feeder

Purpose:

- Loads transformer list.

Data returned:

- dt_id
- feeder_id
- lat
- lon
- capacity_kva
- households_served
- has_known_topology
- pole_count
- device_count

Failure behavior:

- Shows error toast if this request fails during main refresh.

#### GET /api/poles?dt_id={selectedDt}&limit=800

Used by:

- Overview map
- Network map

Purpose:

- Loads poles for the selected transformer.

Data returned:

- pole_id
- lat
- lon
- feeder_id
- dt_id
- seq_on_line
- parent_pole_id
- pole_type
- ward
- pincode
- device_id
- is_energized
- last_telemetry_at

Failure behavior:

- If only this call fails, the map may keep old data or stay empty.

### 23.2 Incidents Page Calls

#### PATCH /api/tickets/{ticket_id}/status

Used by:

- Acknowledge button
- Assign crew button
- Verify repair button
- Verify restoration button in drawer
- Close ticket button

Allowed statuses sent by frontend:

- acknowledged
- crew_assigned
- resolved
- closed

Success behavior:

- Ticket status updates.
- Success toast appears.
- Dashboard refreshes.

Blocked behavior:

- Backend can return blocked when user tries to close too early or verify while poles are still dark.
- UI shows error toast.

Failure behavior:

- UI shows error toast.

### 23.3 Practice Lab Calls

#### POST /api/simulate/span-fault

Purpose:

- Injects a span fault.

Body:

```json
{
  "dt_id": "selected transformer id",
  "from_seq": 5
}
```

Frontend result:

- Success toast.
- UI refresh.
- Ticket appears.

#### POST /api/simulate/transformer-fault

Purpose:

- Injects transformer outage.

Body:

```json
{
  "dt_id": "selected transformer id"
}
```

#### POST /api/simulate/feeder-fault

Purpose:

- Injects feeder outage.

Body:

```json
{
  "feeder_id": "selected feeder id"
}
```

#### POST /api/simulate/repair

Purpose:

- Sends restoration telemetry.

Bodies:

```json
{
  "dt_id": "selected transformer id",
  "from_seq": 5
}
```

```json
{
  "scope": "transformer",
  "dt_id": "selected transformer id"
}
```

```json
{
  "scope": "feeder",
  "feeder_id": "selected feeder id"
}
```

#### POST /api/simulate/scheduled-outage

Purpose:

- Creates planned outage telemetry without false fault ticket.

Body:

```json
{
  "dt_id": "selected transformer id"
}
```

#### POST /api/simulate/kill-device

Purpose:

- Marks a device as offline.

Body:

```json
{}
```

#### POST /api/simulate/duplicate-message

Purpose:

- Creates duplicate telemetry for audit testing.

Body:

```json
{}
```

#### POST /api/simulate/delayed-message

Purpose:

- Creates stale telemetry for audit testing.

Body:

```json
{}
```

### 23.4 APIs Available But Not Directly Used By Current Frontend Screens

#### GET /api/tickets

- Lists up to 100 tickets.
- Current UI gets tickets through GET /api/dashboard.

#### GET /api/tickets/{ticket_id}

- Gets one ticket.
- Current drawer uses ticket data already loaded from dashboard.

#### GET /api/telemetry/recent

- Lists recent telemetry.
- Current UI gets recent telemetry through GET /api/dashboard.

#### POST /api/telemetry

- Ingests real pole device telemetry.
- This is for devices or external clients, not for a visible frontend form.

#### GET /api/health

- Checks backend health.
- Current UI does not call it directly.

## 24. Forms Grouped Page-Wise

### 24.1 Overview Forms

#### Transformer Dropdown

- Field type: select dropdown
- Label: Choose transformer
- Options: transformer ID and feeder ID
- Purpose: select which transformer network slice to inspect
- API impact: next refresh loads poles for selected transformer

### 24.2 Network Map Forms

- No form submission.
- Node selection acts like inspection, not a backend form.

### 24.3 Incidents Forms

#### Incident Search

- Field type: text input
- Placeholder: Search ticket, transformer or PIN
- Purpose: filter incident table
- API impact: none

#### Incident Filter

- Field type: select dropdown
- Options: Open incidents, All incidents, Span faults, Transformer faults, Feeder faults
- Purpose: filter incident table
- API impact: none

### 24.4 Live Signals Forms

#### Telemetry Search

- Field type: text input
- Placeholder: Search pole or device
- Purpose: filter telemetry table
- API impact: none

### 24.5 Practice Lab Forms

- No traditional input fields.
- Scenario cards act as command buttons.
- They submit fixed request bodies to simulator APIs.

### 24.6 Command Palette Form

#### Command Search Input

- Field type: text input
- Placeholder: Jump to a view or run a command...
- Purpose: command entry visual field
- Current API impact: none
- Current filtering behavior: no filtering implemented

## 25. Buttons Grouped Page-Wise

### 25.1 Global Buttons

- Overview sidebar button: opens Overview.
- Network map sidebar button: opens Network map.
- Incidents sidebar button: opens Incidents.
- Live signals sidebar button: opens Live signals.
- Practice lab sidebar button: opens Practice lab.
- Quick actions button: opens command palette.
- Focus mode button: toggles focus mode.
- Theme toggle button: toggles light/dark mode.
- Refresh button: calls refresh APIs.
- Toast close button: dismisses notification.

### 25.2 Overview Buttons

- See open incidents: opens Incidents.
- Try a practice scenario: opens Practice lab.
- Active incidents metric card: opens Incidents.
- Open full map: opens Network map.
- Incident card: opens incident drawer.
- Fault marker: opens incident drawer.
- Pole node: selects pole.
- Transformer node: selects transformer.
- See all open incidents: opens Incidents.
- Turn on / On focus button: toggles focus mode.

### 25.3 Network Map Buttons

- Refresh map: calls refresh APIs.
- Pole node: updates selected node side panel.
- Transformer node: updates selected node side panel.
- Fault node: opens incident drawer.

### 25.4 Incidents Buttons

- Table row: opens incident drawer.
- Acknowledge: PATCH ticket status to acknowledged.
- Assign crew: PATCH ticket status to crew_assigned.
- Verify repair: PATCH ticket status to resolved, backend verifies if telemetry is ready.
- Drawer close: closes drawer.
- Verify restoration in drawer: PATCH ticket status to resolved.
- Close ticket in drawer: PATCH ticket status to closed.

### 25.5 Live Signals Buttons

- No page-specific action buttons.
- Search input filters visible rows.

### 25.6 Practice Lab Buttons

- Span fault: POST /api/simulate/span-fault.
- Transformer outage: POST /api/simulate/transformer-fault.
- Feeder outage: POST /api/simulate/feeder-fault.
- Restore span: POST /api/simulate/repair.
- Restore transformer: POST /api/simulate/repair.
- Restore feeder: POST /api/simulate/repair.
- Scheduled outage: POST /api/simulate/scheduled-outage.
- Kill a device: POST /api/simulate/kill-device.
- Duplicate packet: POST /api/simulate/duplicate-message.
- Delayed packet: POST /api/simulate/delayed-message.

### 25.7 Command Palette Buttons

- Open command center: opens Overview.
- Open incident queue: opens Incidents.
- Inspect network map: opens Network map.
- Inject span fault: POST /api/simulate/span-fault.
- Open scenario lab: opens Practice lab.

## 26. 15-Minute Interview Walkthrough Script

### Minute 0-1: Introduction

"This project is called PowerSense AI. It is a control room console for detecting and managing power distribution faults. The main problem is that when poles go dark, the control room should not receive 40 separate alerts. It should receive one clear incident with location, impact, confidence, and the next action."

### Minute 1-2: Explain The User

"The primary user is a control room operator. This person may be working at 2 a.m., so the interface is designed to be direct. The operator needs to see what broke, where it broke, how many poles are affected, and whether a crew response is needed."

### Minute 2-4: Overview Page

"The first page is the Overview. At the top, the hero explains the product goal: see outages early and restore with confidence. Below that, the metric cards show active incidents, critical exposure, offline devices, poles without power, and signal continuity. These numbers come from the backend dashboard API and refresh every 5 seconds."

"The operator can immediately click See open incidents or the Active incidents card to go to the incident queue. They can also click Try a practice scenario to test the simulator."

### Minute 4-5: Map Preview And Focus

"The Overview also has a live network view. Green nodes are live poles, red nodes are dark poles, gray nodes have no device, and orange markers are incidents. The transformer selector lets me focus on one transformer area. If the topology is known, the UI shows Verified layout. If it is missing, the UI honestly says Estimated layout."

### Minute 5-7: Network Map Page

"The Network map page is the spatial view. It helps an operator inspect the selected transformer network. Clicking a pole opens details on the side: feeder, DT or ward, device ID, and last signal. Clicking a fault marker opens the incident drawer."

"This map is intentionally schematic. It is enough for the operator to understand the fault boundary and affected area without needing a full GIS product."

### Minute 7-9: Incidents Page

"The Incidents page is the main workflow page. It has search, filtering, and a table. The table shows incident ID, location, impact, confidence, status, and next action."

"A ticket moves from Detected to Acknowledged to Crew assigned to Verified and Closed. The important product decision is that the UI does not allow fake closure. If the affected poles are still dark, the system blocks verification and shows an error."

### Minute 9-10: Incident Drawer

"When I open an incident, the drawer gives a complete brief. It shows the fault type, status, lifecycle rail, restoration state, summary, confidence reason, PIN code, last live pole, first dark pole, and affected poles."

"This is the screen I would expect the operator to use before assigning a crew."

### Minute 10-11: Live Signals Page

"The Live signals page is the audit trail. It shows recent telemetry packets. Each row tells when the packet arrived, which pole and device sent it, the event type, power state, sequence number, and quality."

"This is useful because the assignment specifically asks us to handle duplicate and out-of-order messages. Here the reviewer can see packets marked Applied, Duplicate, or Stale."

### Minute 11-13: Practice Lab Demo

"The Practice lab is the evaluator-friendly simulator. I can inject a span fault, transformer outage, or feeder outage. The backend creates telemetry, localizes the fault, and creates a ticket. I can then restore a span, transformer, or feeder and watch the ticket become verified from telemetry."

"There are also messy data scenarios: scheduled outage, kill a device, duplicate packet, and delayed packet. These prove the system is not just alerting on every dark or missing signal."

### Minute 13-14: Real-Time Behavior And APIs

"The frontend updates through polling every 5 seconds. It calls the dashboard API, transformer API, and poles API. Ticket actions call the ticket status API. Simulator actions call the simulator APIs. There are no frontend WebSockets right now, which keeps deployment simple."

### Minute 14-15: Closing Summary

"The strongest product idea here is trust. The system groups many dark poles into one incident, explains confidence, avoids known false positives like scheduled outages and bad packets, and only verifies restoration when telemetry confirms power is back. So the operator gets a clear workflow instead of noisy alerts."

## 27. Short Final Summary For Interview

"PowerSense AI is a control room console for outage localization. The user starts on the Overview, sees active faults and grid health, inspects the Network map, manages tickets in the Incidents queue, audits raw telemetry in Live signals, and uses the Practice lab to simulate faults and repairs. The key product rule is that tickets cannot be truly verified until affected poles send live telemetry. The UI is designed for clarity, trust, and fast action by a non-technical operator."

