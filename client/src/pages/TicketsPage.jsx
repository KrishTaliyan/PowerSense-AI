import { ErrorState, PageSkeleton } from "../components/PageState.jsx";
import TicketTable from "../components/TicketTable.jsx";

export default function TicketsPage({ activeTickets, error, loading, refresh, selectTicket, tickets, updateTicketStatus }) {
  if (loading) return <PageSkeleton rows={4} />;
  if (error && !tickets.length) return <ErrorState detail={error} onRetry={refresh} title="Incident queue could not load" />;

  return (
    <div className="page-stack" data-tour="incidents">
      <div className="page-heading">
        <div><span className="eyebrow">Human-in-the-loop workflow</span><h1>Incident queue</h1><p>Prioritize what needs a crew now, with evidence attached.</p></div>
        <div className="heading-stat"><strong>{activeTickets.length}</strong><span>active incidents</span></div>
      </div>
      <TicketTable onSelect={selectTicket} onStatus={updateTicketStatus} tickets={tickets} />
    </div>
  );
}
