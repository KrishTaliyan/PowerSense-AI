import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import TicketTable from "../components/TicketTable.jsx";

export default function TicketsPage({ activeTickets, busy, error, loading, refresh, selectTicket, tickets, updateTicketStatus }) {
  if (loading) return <PageSkeleton rows={4} />;
  if (error && !tickets.length) return <ErrorState detail={error} onRetry={refresh} title="Incident queue could not load" />;

  const awaitingVerification = activeTickets.filter((ticket) => ticket.can_verify_repair).length;

  return (
    <div className="page-stack" data-tour="incidents">
      <div className="page-heading">
        <div><span className="eyebrow">Human-in-the-loop workflow</span><h1>Incidents</h1><p>Prioritize what needs a crew now, with evidence attached.</p></div>
        <div className="heading-stats">
          <div className="heading-stat"><strong>{activeTickets.length}</strong><span>Open</span></div>
          <div className="heading-stat"><strong>{awaitingVerification}</strong><span>Ready to verify</span></div>
          <div className="heading-stat"><strong>{tickets.length - activeTickets.length}</strong><span>Resolved</span></div>
        </div>
      </div>
      <TicketTable busy={busy} onSelect={selectTicket} onStatus={updateTicketStatus} tickets={tickets} />
    </div>
  );
}
