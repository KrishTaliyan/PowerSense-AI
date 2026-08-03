import TicketTable from "../components/TicketTable.jsx";

export default function TicketsPage({ activeTickets, selectTicket, tickets, updateTicketStatus }) {
  return (
    <div className="page-stack">
      <div className="page-heading">
        <div><span className="eyebrow">Human-in-the-loop workflow</span><h1>Incident queue</h1><p>Prioritize what needs a crew now, with evidence attached.</p></div>
        <div className="heading-stat"><strong>{activeTickets.length}</strong><span>active incidents</span></div>
      </div>
      <TicketTable onSelect={selectTicket} onStatus={updateTicketStatus} tickets={tickets} />
    </div>
  );
}
