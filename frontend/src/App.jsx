import { useState, useEffect } from "react";
import "./style.css";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API_URL = `${API_ORIGIN}/api/v1`;

function App() {
  const [activeTab, setActiveTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bookleaf_user"));
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(
    () => localStorage.getItem("bookleaf_token") || ""
  );
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [adminTickets, setAdminTickets] = useState([]);
  const [adminStatusFilter, setAdminStatusFilter] = useState("");
  const [adminPriorityFilter, setAdminPriorityFilter] = useState("");
  const [adminCategoryFilter, setAdminCategoryFilter] = useState("");
  const [adminDateFromFilter, setAdminDateFromFilter] = useState("");
  const [adminDateToFilter, setAdminDateToFilter] = useState("");
  const [assigningTicket, setAssigningTicket] = useState(false);
  const [assignmentMessage, setAssignmentMessage] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [ticketUpdating, setTicketUpdating] = useState(false);
  const [ticketUpdateMessage, setTicketUpdateMessage] = useState("");
  const [ticketUpdateError, setTicketUpdateError] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteMessage, setNoteMessage] = useState("");
  const [noteError, setNoteError] = useState("");
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftError, setAiDraftError] = useState("");
  const [aiDraftMessage, setAiDraftMessage] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedTicketBaseline, setSelectedTicketBaseline] = useState(null);

async function handleOpenTicket(ticket) {
  // The author ticket-detail panel is rendered only on the Support Tickets page.
  // Move authors there before selecting a ticket, including clicks from Overview.
  if (user?.role?.toLowerCase() !== "admin") {
    setActivePage("tickets");
  } else {
    setActivePage("admin-tickets");
  }

  setSelectedTicket(ticket);
  setSelectedTicketBaseline({ ...ticket });
  setTicketMessages([]);
  setMessageText("");
  setNoteText("");
  setNoteMessage("");
  setNoteError("");
  setTicketUpdateMessage("");
  setTicketUpdateError("");

  try {
    const response = await fetch(
      `${API_URL}/tickets/${ticket.id}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error("Could not load ticket details.");
    }

    const fullTicket = await response.json();

    setSelectedTicket(fullTicket);
    setSelectedTicketBaseline({ ...fullTicket });
    setTicketMessages(fullTicket.messages || []);
  } catch (error) {
    setTicketUpdateError(error.message || "Could not load ticket details.");
  }
}
  const [ticketMessages, setTicketMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [messageLoading, setMessageLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");
  const [activePage, setActivePage] = useState(() => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("bookleaf_user"));
      return savedUser?.role?.toLowerCase() === "admin" ? "admin-tickets" : "dashboard";
    } catch {
      return "dashboard";
    }
  });
  
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDescription, setTicketDescription] = useState("");
  const [ticketBookId, setTicketBookId] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");


  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new URLSearchParams();
      formData.append("username", email.trim().toLowerCase());
      formData.append("password", password);

      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = Array.isArray(data.detail)
          ? data.detail.map((item) => item.msg).join(", ")
          : typeof data.detail === "string"
            ? data.detail
            : "Login failed. Please try again.";
        throw new Error(message);
      }

      const expectedRole = activeTab === "admin" ? "admin" : "author";
      if (data.user.role !== expectedRole) {
        throw new Error(
          expectedRole === "admin"
            ? "This account does not have admin access."
            : "Please use an author account."
        );
      }

      localStorage.setItem("bookleaf_token", data.access_token);
      localStorage.setItem("bookleaf_user", JSON.stringify(data.user));

      setToken(data.access_token);
      setUser(data.user);

      if (data.user.role?.toLowerCase() === "admin") {
        setActivePage("admin-tickets");
        await loadAdminTickets(data.access_token);
      } else {
        setActivePage("dashboard");
        await loadDashboard(data.access_token);
      }
    } catch (err) {
      setError(err.message || "Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard(accessToken = token) {
    setDashboardLoading(true);
    setDashboardError("");

    try {
      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const [booksResponse, ticketsResponse] = await Promise.all([
        fetch(`${API_URL}/books`, { headers }),
        fetch(`${API_URL}/tickets`, { headers }),
      ]);

      if (!booksResponse.ok || !ticketsResponse.ok) {
        throw new Error("Unable to load dashboard data. Please sign in again.");
      }

      const booksData = await booksResponse.json();
      const ticketsData = await ticketsResponse.json();

      setBooks(booksData);
      setTickets(ticketsData);
    } catch (err) {
      setDashboardError(err.message || "Could not load dashboard data.");
    } finally {
      setDashboardLoading(false);
    }
  }

  const loadAdminTickets = async (accessToken = token) => {
    setAdminLoading(true);
    setAdminError("");

    try {
      const params = new URLSearchParams();

      if (adminStatusFilter) {
        params.append("status", adminStatusFilter);
      }

      if (adminPriorityFilter) {
        params.append("priority", adminPriorityFilter);
      }

      if (adminCategoryFilter) {
        params.append("category", adminCategoryFilter);
      }
      if (adminDateFromFilter) {
        params.append("date_from", adminDateFromFilter);
      }
      if (adminDateToFilter) {
        params.append("date_to", adminDateToFilter);
      }

      const query = params.toString();

      const response = await fetch(
        `${API_URL}/admin/tickets${query ? `?${query}` : ""}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load admin tickets.");
      }

      setAdminTickets(data);
      return data;
    } catch (err) {
      setAdminError(err.message || "Could not load admin tickets.");
      return null;
    } finally {
      setAdminLoading(false);
    }
  };

  async function handleAssignTicketToMe() {
    if (!selectedTicket) return;

    setAssigningTicket(true);
    setAssignmentMessage("");
    setAssignmentError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/tickets/${selectedTicket.id}/assign-to-me`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || "Could not assign this ticket to you.");
      }

      setSelectedTicket((current) => ({
        ...current,
        assigned_to: data.assigned_to || current.assigned_to,
      }));
      setSelectedTicketBaseline((current) => ({
        ...current,
        assigned_to: data.assigned_to || current?.assigned_to,
      }));
      setAssignmentMessage(data.message || "Ticket assigned to you successfully.");
      await loadAdminTickets(token);
    } catch (err) {
      setAssignmentError(err.message || "Could not assign this ticket to you.");
    } finally {
      setAssigningTicket(false);
    }
  }

  async function handleUpdateTicket() {
    if (!selectedTicket) {
      return;
    }

    const baseline = selectedTicketBaseline || {};
    const updates = {};

    for (const field of ["status", "priority", "category"]) {
      if (selectedTicket[field] !== baseline[field]) {
        updates[field] = selectedTicket[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      setTicketUpdateMessage("There are no ticket changes to save.");
      setTicketUpdateError("");
      return;
    }

    setTicketUpdating(true);
    setTicketUpdateMessage("");
    setTicketUpdateError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/tickets/${selectedTicket.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(updates),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Could not update ticket.");
      }

      const updatedTicket = data.ticket || data;
      const refreshedTickets = await loadAdminTickets(token);
      const ticketFromQueue = Array.isArray(refreshedTickets)
        ? refreshedTickets.find((ticket) => ticket.id === selectedTicket.id)
        : null;
      const nextTicket = ticketFromQueue || {
        ...selectedTicket,
        ...(updatedTicket && typeof updatedTicket === "object"
          ? updatedTicket
          : {}),
      };

      setSelectedTicket(nextTicket);
      setSelectedTicketBaseline({ ...nextTicket });
      setTicketUpdateMessage("Ticket changes saved.");
    } catch (err) {
      setTicketUpdateError(err.message || "Could not update ticket.");
    } finally {
      setTicketUpdating(false);
    }
  }

  async function handleAddNote(event) {
    event.preventDefault();

    if (!selectedTicket || !noteText.trim()) {
      return;
    }

    setNoteLoading(true);
    setNoteMessage("");
    setNoteError("");

    try {
      const response = await fetch(
        `${API_URL}/admin/tickets/${selectedTicket.id}/notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ body: noteText.trim() }),
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Could not add private note.");
      }

      setNoteText("");
      if (data && data.id) {
        setSelectedTicket((current) => ({
          ...current,
          notes: [...(current?.notes || []), data],
        }));
      }
      setNoteMessage("Private note added.");
    } catch (err) {
      setNoteError(err.message || "Could not add private note.");
    } finally {
      setNoteLoading(false);
    }
  }

  async function loadTicketMessages(ticketId) {
    try {
      const response = await fetch(`${API_URL}/tickets/${ticketId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to load ticket details");
      }

      const data = await response.json();
      setTicketMessages(data.messages || []);
    } catch (error) {
      console.error("Error loading ticket messages:", error);
      setTicketMessages([]);
    }
  }

  async function handleGenerateAiDraft() {
    if (!selectedTicket) return;

    setAiDraftLoading(true);
    setAiDraftError("");
    setAiDraftMessage("");

    try {
      const response = await fetch(
        `${API_URL}/admin/tickets/${selectedTicket.id}/ai-draft`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.detail || "Could not generate an AI draft.");
      }

      setMessageText(data.ai_draft || "");
      setSelectedTicket((current) => ({
        ...current,
        ai_draft: data.ai_draft || "",
      }));
      setAiDraftMessage("AI draft generated. Review it before sending.");
    } catch (err) {
      setAiDraftError(err.message || "Could not generate an AI draft.");
    } finally {
      setAiDraftLoading(false);
    }
  }

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!selectedTicket || !messageText.trim()) {
      return;
    }

    setMessageLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/tickets/${selectedTicket.id}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            body: messageText.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to send message");
      }

      setMessageText("");
      await loadTicketMessages(selectedTicket.id);
      if (user?.role?.toLowerCase() === "admin") {
        await loadAdminTickets(token);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert(error.message || "Could not send message.");
    } finally {
      setMessageLoading(false);
    }
  }
  
async function handleCreateTicket(event) {
  event.preventDefault();
  setTicketSubmitting(true);
  setTicketMessage("");

  try {
    const response = await fetch(`${API_URL}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        book_id: ticketBookId,
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        typeof data.detail === "string"
          ? data.detail
          : "Unable to create ticket. Please try again.";
      throw new Error(message);
    }

    setTicketMessage("Support ticket created successfully!");
    setTicketSubject("");
    setTicketDescription("");
    setTicketBookId("");
    setShowTicketForm(false);

    await loadDashboard(token);
  } catch (err) {
    setTicketMessage(err.message || "Could not connect to the server.");
  } finally {
    setTicketSubmitting(false);
  }
}

  useEffect(() => {
    if (!user || !token) return;

    if (user.role?.toLowerCase() === "admin") {
      setActivePage("admin-tickets");
      loadAdminTickets(token);
    } else {
      setActivePage((currentPage) => currentPage === "admin-tickets" ? "dashboard" : currentPage);
      loadDashboard(token);
    }
    // Load the correct data set when the authenticated account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token]);

  function logout() {
    localStorage.removeItem("bookleaf_token");
    localStorage.removeItem("bookleaf_user");
    setToken("");
    setUser(null);
    setPassword("");
    setBooks([]);
    setTickets([]);
    setAdminTickets([]);
    setSelectedTicket(null);
    setTicketMessages([]);
    setActivePage("dashboard");
    setError("");
  }

  if (user && token) {
    const totalEarned = books.reduce(
      (sum, book) => sum + Number(book.total_royalty_earned || 0),
      0
    );
    const totalPaid = books.reduce(
      (sum, book) => sum + Number(book.royalty_paid || 0),
      0
    );
    const totalPending = books.reduce(
      (sum, book) => sum + Number(book.royalty_pending || 0),
      0
    );

    return (
      <div className="dashboard-app">
        <header className="dashboard-topbar">
          <div className="brand">
            <h2>BookLeaf</h2>
            <span>{user?.role?.toLowerCase() === "admin" ? "Admin Portal" : "Author Portal"}</span>
          </div>
          <div className="user-menu">
            <span>{user.email}</span>
            <button className="logout-button" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        <div className="dashboard-layout">
          <aside className="sidebar">
            <p className="sidebar-label">{user?.role?.toLowerCase() === "admin" ? "ADMIN WORKSPACE" : "WORKSPACE"}</p>
            {user?.role?.toLowerCase() === "admin" ? (
              <button
                className={activePage === "admin-tickets" ? "nav-item selected" : "nav-item"}
                onClick={() => setActivePage("admin-tickets")}
              >
                <span>✉</span> Admin Tickets
              </button>
            ) : (
              <>
                <button
                  className={activePage === "dashboard" ? "nav-item selected" : "nav-item"}
                  onClick={() => setActivePage("dashboard")}
                >
                  <span>▦</span> Overview
                </button>
                <button
                  className={activePage === "books" ? "nav-item selected" : "nav-item"}
                  onClick={() => setActivePage("books")}
                >
                  <span>▤</span> My Books
                </button>
                <button
                  className={activePage === "tickets" ? "nav-item selected" : "nav-item"}
                  onClick={() => setActivePage("tickets")}
                >
                  <span>✉</span> Support Tickets
                </button>
              </>
            )}
          </aside>

          <main className="dashboard-content">
            <div className="dashboard-heading">
              <div>
                <p className="eyebrow">{user?.role?.toLowerCase() === "admin" ? "ADMIN WORKSPACE" : "AUTHOR WORKSPACE"}</p>
                <h1>
                  {user?.role?.toLowerCase() === "admin"
                    ? (selectedTicket ? "Ticket Details" : "Admin Ticket Queue")
                    : selectedTicket && activePage === "tickets"
                      ? "Ticket Details"
                    : activePage === "dashboard"
                      ? "Your overview"
                      : activePage === "books"
                        ? "My Books"
                        : "Support Tickets"}
                </h1>
                <p className="subtitle">
                  {user?.role?.toLowerCase() === "admin"
                    ? "Review, filter, and respond to author support requests."
                    : "Welcome back. Here's what's happening with your publishing journey."}
                </p>
              </div>
              <button
                className="refresh-button"
                onClick={() => user?.role?.toLowerCase() === "admin" ? loadAdminTickets(token) : loadDashboard(token)}
                disabled={user?.role?.toLowerCase() === "admin" ? adminLoading : dashboardLoading}
              >
                {(user?.role?.toLowerCase() === "admin" ? adminLoading : dashboardLoading) ? "Loading..." : "↻ Refresh"}
              </button>
            </div>

            {dashboardError && (
              <div className="error-message">{dashboardError}</div>
            )}

            {dashboardLoading ? (
              <div className="panel">Loading your information...</div>
            ) : (
              <>
                {user?.role?.toLowerCase() !== "admin" && activePage === "dashboard" && (
                  <>
                    <div className="stats-grid">
                      <div className="stat-card">
                        <span className="stat-icon">▤</span>
                        <p>Total books</p>
                        <h2>{books.length}</h2>
                      </div>
                      <div className="stat-card">
                        <span className="stat-icon">₹</span>
                        <p>Total royalties earned</p>
                        <h2>{formatCurrency(totalEarned)}</h2>
                      </div>
                      <div className="stat-card">
                        <span className="stat-icon">✓</span>
                        <p>Royalties paid</p>
                        <h2>{formatCurrency(totalPaid)}</h2>
                      </div>
                      <div className="stat-card">
                        <span className="stat-icon">◷</span>
                        <p>Royalties pending</p>
                        <h2>{formatCurrency(totalPending)}</h2>
                      </div>
                    </div>

                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Your books</h2>
                          <p>Publication and royalty overview</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setActivePage("books")}
                        >
                          View all
                        </button>
                      </div>
                      <BookTable books={books.slice(0, 5)} />
                    </section>

                    <section className="panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Recent support tickets</h2>
                          <p>Track your support requests</p>
                        </div>
                        <button
                          className="text-button"
                          onClick={() => setActivePage("tickets")}
                        >
                          View all
                        </button>
                      </div>
                      <TicketList
                       tickets={tickets.slice(0, 3)}
                       onOpenTicket={handleOpenTicket}
                                                        />
                    </section>
                  </>
                )}

                {user?.role?.toLowerCase() !== "admin" && activePage === "books" && (
                  <section className="panel">
                    <div className="panel-heading">
                      <div>
                        <h2>All your books</h2>
                        <p>Sales, publication status, and royalty details</p>
                      </div>
                    </div>
                    <BookTable books={books} detailed />
                  </section>
                )}

                {user?.role?.toLowerCase() !== "admin" && activePage === "tickets" && !selectedTicket && (
  <section className="panel">
    <div className="panel-heading">
      <div>
        <h2>Your support requests</h2>
        <p>View the status of your support tickets</p>
      </div>
    </div>

<div className="ticket-form-section">
  {!selectedTicket && (
    <button
      className="login-button"
      type="button"
      onClick={() => {
        setShowTicketForm(!showTicketForm);
        setTicketMessage("");
      }}
    >
      {showTicketForm ? "Cancel" : "+ Create Support Ticket"}
    </button>
  )}
      
  {showTicketForm && (
    <form onSubmit={handleCreateTicket} className="ticket-form">
      <label htmlFor="ticket-book">Related book</label>
      <select
        id="ticket-book"
        value={ticketBookId}
        onChange={(event) => setTicketBookId(event.target.value)}
        required
      >
        <option value="">Select a book</option>
        {books.map((book) => (
          <option key={book.id} value={book.id}>
            {book.title}
          </option>
        ))}
      </select>

      <label htmlFor="ticket-subject">Subject</label>
      <input
        id="ticket-subject"
        value={ticketSubject}
        onChange={(event) => setTicketSubject(event.target.value)}
        placeholder="e.g. Question about royalty payment"
        required
      />

      <label htmlFor="ticket-description">Description</label>
      <textarea
        id="ticket-description"
        value={ticketDescription}
        onChange={(event) => setTicketDescription(event.target.value)}
        placeholder="Describe how we can help..."
        rows={5}
        required
      />

      <button
        className="login-button"
        type="submit"
        disabled={ticketSubmitting}
      >
        {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
      </button>
    </form>
  )}

  {ticketMessage && (
    <p className="ticket-form-message">{ticketMessage}</p>
  )}
</div>

{!selectedTicket && (
  <TicketList
    tickets={tickets}
    detailed
    onOpenTicket={handleOpenTicket}
  />
)}
</section>
)}

{user?.role?.toLowerCase() === "admin" &&
  activePage === "admin-tickets" &&
  !selectedTicket && (
  <section className="panel">
    <div className="panel-heading">
      <div>
        <h2>Admin Ticket Queue</h2>
        <p>Review and manage author support requests</p>
      </div>

      <button
        type="button"
        className="text-button"
        onClick={() => loadAdminTickets(token)}
      >
        ↻ Refresh
      </button>
    </div>

    <div className="admin-ticket-filters">
      <select
        value={adminStatusFilter}
        onChange={(event) => setAdminStatusFilter(event.target.value)}
      >
        <option value="">All statuses</option>
        <option value="Open">Open</option>
        <option value="In Progress">In Progress</option>
        <option value="Resolved">Resolved</option>
        <option value="Closed">Closed</option>
      </select>

      <select
        value={adminCategoryFilter}
        onChange={(event) => setAdminCategoryFilter(event.target.value)}
      >
        <option value="">All categories</option>
        <option value="Royalty & Payments">Royalty &amp; Payments</option>
        <option value="ISBN & Metadata Issues">ISBN &amp; Metadata Issues</option>
        <option value="Printing & Quality">Printing &amp; Quality</option>
        <option value="Distribution & Availability">Distribution &amp; Availability</option>
        <option value="Book Status & Production Updates">Book Status &amp; Production Updates</option>
        <option value="General Inquiry">General Inquiry</option>
      </select>

      <select
        value={adminPriorityFilter}
        onChange={(event) => setAdminPriorityFilter(event.target.value)}
      >
        <option value="">All priorities</option>
        <option value="Critical">Critical</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>

      <label className="admin-date-filter">
        Date from
        <input
          type="date"
          value={adminDateFromFilter}
          onChange={(event) => setAdminDateFromFilter(event.target.value)}
        />
      </label>
      <label className="admin-date-filter">
        Date to
        <input
          type="date"
          value={adminDateToFilter}
          min={adminDateFromFilter || undefined}
          onChange={(event) => setAdminDateToFilter(event.target.value)}
        />
      </label>

      <button
        type="button"
        className="login-button"
        onClick={() => loadAdminTickets(token)}
      >
        Apply Filters
      </button>
    </div>

    {adminLoading && <p>Loading tickets...</p>}

    {adminError && (
      <p className="error-message">{adminError}</p>
    )}

    {!adminLoading && !adminError && (
      <>
        <p>{adminTickets.length} ticket(s) found</p>

        {adminTickets.length === 0 ? (
          <p className="empty-state">No tickets match these filters.</p>
        ) : (
          <TicketList
            tickets={adminTickets}
            detailed
            onOpenTicket={handleOpenTicket}
          />
        )}
      </>
    )}

  </section>
)}
</>
)}

    {user?.role?.toLowerCase() === "admin" &&
      activePage === "admin-tickets" &&
      selectedTicket && (
      <div className="ticket-detail admin-ticket-detail">
        <hr />
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setSelectedTicket(null);
            setSelectedTicketBaseline(null);
            setTicketMessages([]);
            setMessageText("");
            setNoteText("");
          }}
        >
          ← Back to queue
        </button>
        <h2>{selectedTicket.subject}</h2>
        <p><strong>Status:</strong> {selectedTicket.status}</p>
        <p><strong>Category:</strong> {selectedTicket.category}</p>
        <p><strong>Priority:</strong> {selectedTicket.priority}</p>
        <p><strong>Description:</strong></p>
        <p>{selectedTicket.description}</p>

        <div className="admin-ticket-controls">
          <h3>Manage Ticket</h3>
          <button
            type="button"
            className="login-button"
            onClick={handleAssignTicketToMe}
            disabled={assigningTicket}
          >
            {assigningTicket ? "Assigning..." : "Assign to Me"}
          </button>
          {assignmentMessage && (
            <p className="ticket-action-message success-message">{assignmentMessage}</p>
          )}
          {assignmentError && (
            <p className="ticket-action-message error-message">{assignmentError}</p>
          )}

          <label>
            Ticket Status
            <select
              value={selectedTicket.status || ""}
              onChange={(event) =>
                setSelectedTicket({
                  ...selectedTicket,
                  status: event.target.value,
                })
              }
            >
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>
          </label>

          <label>
            Priority
            <select
              value={selectedTicket.priority || ""}
              onChange={(event) =>
                setSelectedTicket({
                  ...selectedTicket,
                  priority: event.target.value,
                })
              }
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </label>

          <label>
            Category
            <select
              value={selectedTicket.category || ""}
              onChange={(event) =>
                setSelectedTicket({
                  ...selectedTicket,
                  category: event.target.value,
                })
              }
            >
              <option value="Royalty & Payments">Royalty &amp; Payments</option>
              <option value="ISBN & Metadata Issues">ISBN &amp; Metadata Issues</option>
              <option value="Printing & Quality">Printing &amp; Quality</option>
              <option value="Distribution & Availability">Distribution &amp; Availability</option>
              <option value="Book Status & Production Updates">Book Status &amp; Production Updates</option>
              <option value="General Inquiry">General Inquiry</option>
            </select>
          </label>

          <button
            type="button"
            className="login-button"
            onClick={handleUpdateTicket}
            disabled={ticketUpdating}
          >
            {ticketUpdating ? "Saving..." : "Save Changes"}
          </button>

          {ticketUpdateMessage && (
            <p className="ticket-action-message success-message">
              {ticketUpdateMessage}
            </p>
          )}
          {ticketUpdateError && (
            <p className="ticket-action-message error-message">
              {ticketUpdateError}
            </p>
          )}

          <hr />

          <h3>Private Internal Note</h3>

          <form onSubmit={handleAddNote}>
            <textarea
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add a private note for the support team..."
              rows={3}
              required
            />

            <button
              type="submit"
              className="login-button"
              disabled={noteLoading || !noteText.trim()}
            >
              {noteLoading ? "Adding..." : "Add Private Note"}
            </button>
          </form>
                            <div className="private-notes-list">
  <h3>Saved Private Notes</h3>

  {selectedTicket.notes?.length > 0 ? (
    selectedTicket.notes.map((note) => (
      <div className="private-note-item" key={note.id}>
        <p>{note.body}</p>
        <small>
          {note.created_at
            ? new Date(note.created_at).toLocaleString("en-IN")
            : "Date unavailable"}
        </small>
      </div>
    ))
  ) : (
    <p>No private notes yet.</p>
  )}
</div>
          

          {noteMessage && (
            <p className="ticket-action-message success-message">{noteMessage}</p>
          )}
          {noteError && (
            <p className="ticket-action-message error-message">{noteError}</p>
          )}
        </div>

        <div className="ticket-conversation">
          <h3>Conversation</h3>
          {ticketMessages.length === 0 ? (
            <p className="empty-state">No messages yet.</p>
          ) : (
            <div className="message-list">
              {ticketMessages.map((message) => (
                <div className="message-item" key={message.id}>
                  <strong>{message.sender_id === user.id ? "You (Support Team)" : "Author"}</strong>
                  <p>{message.body}</p>
                  <small>{message.created_at ? new Date(message.created_at).toLocaleString("en-IN") : ""}</small>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="message-form">
            <textarea
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              placeholder="Reply to the author..."
              rows={3}
              required
            />
            <button
              type="button"
              className="text-button"
              onClick={handleGenerateAiDraft}
              disabled={aiDraftLoading || messageLoading}
            >
              {aiDraftLoading ? "Generating AI Draft..." : "✨ Generate AI Draft"}
            </button>
            {aiDraftMessage && (
              <p className="ticket-action-message success-message">{aiDraftMessage}</p>
            )}
            {aiDraftError && (
              <p className="ticket-action-message error-message">{aiDraftError}</p>
            )}
            <button type="submit" className="login-button" disabled={messageLoading || !messageText.trim()}>
              {messageLoading ? "Sending..." : "Send Reply"}
            </button>
          </form>
        </div>
      </div>
    )}

            {user?.role?.toLowerCase() !== "admin" &&
              activePage === "tickets" &&
              selectedTicket && (
                <section className="panel ticket-detail">
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSelectedTicket(null);
                      setTicketMessages([]);
                      setMessageText("");
                    }}
                  >
                    ← Back to tickets
                  </button>
                  <h2>{selectedTicket.subject}</h2>
                  <p><strong>Status:</strong> {selectedTicket.status}</p>
                  <p><strong>Category:</strong> {selectedTicket.category}</p>
                  <p><strong>Priority:</strong> {selectedTicket.priority}</p>
                  <p><strong>Description:</strong></p>
                  <p>{selectedTicket.description}</p>

                  <div className="ticket-conversation">
                    <h3>Conversation</h3>
                    {ticketMessages.length === 0 ? (
                      <p className="empty-state">No messages yet. Send a message to start the conversation.</p>
                    ) : (
                      <div className="message-list">
                        {ticketMessages.map((message) => (
                          <div className="message-item" key={message.id}>
                            <strong>
                              {user?.id && message.sender_id === user.id ? "You" : "Support Team"}
                            </strong>
                            <p>{message.body}</p>
                            <small>
                              {message.created_at
                                ? new Date(message.created_at).toLocaleString("en-IN")
                                : ""}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                    <form onSubmit={handleSendMessage} className="message-form">
                      <textarea
                        value={messageText}
                        onChange={(event) => setMessageText(event.target.value)}
                        placeholder="Type your message..."
                        rows={3}
                        required
                      />
                      <button
                        type="submit"
                        className="login-button"
                        disabled={messageLoading || !messageText.trim()}
                      >
                        {messageLoading ? "Sending..." : "Send Message"}
                      </button>
                    </form>
                  </div>
                </section>
              )}
</main>
</div>
</div>
);
}

  return (
    <div className="app">
      <header className="topbar">
        <h2>BookLeaf</h2>
        <span>Author Support Portal</span>
      </header>

      <main className="main-content">
        <section className="welcome">
          <p className="eyebrow">BOOKLEAF AUTHOR SERVICES</p>
          <h1>Your publishing journey, supported.</h1>
          <p>
            Manage your books, track royalties, and get help from our
            author support team in one place.
          </p>
        </section>

        <section className="login-card">
          <h2>Welcome back</h2>
          <p>Sign in to your account.</p>

          <div className="tabs">
            <button
              type="button"
              className={activeTab === "login" ? "active" : ""}
              onClick={() => {
                setActiveTab("login");
                setError("");
              }}
            >
              Author Login
            </button>
            <button
              type="button"
              className={activeTab === "admin" ? "active" : ""}
              onClick={() => {
                setActiveTab("admin");
                setError("");
              }}
            >
              Admin Login
            </button>
          </div>

          <form onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={activeTab === "admin" ? "admin@example.com" : "you@example.com"}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {error && <p className="error-message">{error}</p>}

            <button className="login-button" type="submit" disabled={loading}>
              {loading
                ? "Signing in..."
                : `Sign In as ${activeTab === "admin" ? "Admin" : "Author"}`}
            </button>
          </form>

          <p className="helper">Secure access to your BookLeaf account.</p>
        </section>
      </main>
    </div>
  );
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function BookTable({ books, detailed = false }) {
  if (!books.length) {
    return <p className="empty-state">No books found for this account.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Book title</th>
            <th>Status</th>
            <th>Copies sold</th>
            <th>Royalties earned</th>
            {detailed && <th>Pending</th>}
          </tr>
        </thead>
        <tbody>
          {books.map((book) => (
            <tr key={book.id}>
              <td>
                <strong>{book.title}</strong>
                <small>{book.isbn || "ISBN not available"}</small>
              </td>
              <td>
                <span className="status-pill">{book.status || "Unknown"}</span>
              </td>
              <td>{book.total_copies_sold ?? 0}</td>
              <td>{formatCurrency(Number(book.total_royalty_earned || 0))}</td>
              {detailed && (
                <td>{formatCurrency(Number(book.royalty_pending || 0))}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketList({
  tickets,
  detailed = false,
  onOpenTicket,
}) {
  if (!tickets.length) {
    return (
      <p className="empty-state">
        No support tickets yet. You can create one in the next step.
      </p>
    );
  }

  return (
    <div className="ticket-list">
      {tickets.map((ticket) => (
        <article
  className="ticket-row"
  key={ticket.id}
  onClick={() => onOpenTicket(ticket)}
  style={{ cursor: "pointer" }}
>
          <div className="ticket-mark">✉</div>
          <div className="ticket-info">
            <strong>{ticket.subject}</strong>
            <p>
              {ticket.category} · {ticket.created_at
                ? new Date(ticket.created_at).toLocaleDateString("en-IN")
                : "Date unavailable"}
            </p>
            {detailed && <p>{ticket.description}</p>}
          </div>
          <span className="status-pill">{ticket.status}</span>
        </article>
      ))}
    </div>
  );
}

export default App;
