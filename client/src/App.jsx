import { useEffect, useState } from "react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

function App() {
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [response, setResponse] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isWakingUp, setIsWakingUp] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let retryTimeout;

    const checkHealth = async () => {
      try {
        await axios.get(`${API_BASE_URL}/health`, { timeout: 4000 });
        if (!isMounted) {
          return;
        }
        setIsConnected(true);
        setIsWakingUp(false);
      } catch {
        if (!isMounted) {
          return;
        }
        setIsConnected(false);
        setIsWakingUp(true);
        retryTimeout = setTimeout(checkHealth, 3000);
      }
    };

    checkHealth();

    return () => {
      isMounted = false;
      clearTimeout(retryTimeout);
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResponse(null);

    if (!isConnected) {
      setIsWakingUp(true);
    }

    const payload = {
      email: email.trim() || null,
      phoneNumber: phoneNumber.trim() || null,
    };

    try {
      const res = await axios.post(`${API_BASE_URL}/identify`, payload);
      setResponse(res.data);
      setIsConnected(true);
      setIsWakingUp(false);
    } catch (err) {
      setError(err.response?.data?.message || "Request failed");
      setIsConnected(false);
      setIsWakingUp(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Identity Reconciliation</h1>
        <div className="statusRow">
          <span className={`statusBulb ${isConnected ? "connected" : "waking"}`} />
          <p className="statusText">{isConnected ? "Render backend connected" : "Render backend is waking up from sleep..."}</p>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="mcfly@hillvalley.edu" />
          </label>

          <label>
            Phone Number
            <input type="text" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="123456" />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Checking..." : "Identify"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        {response ? <pre>{JSON.stringify(response, null, 2)}</pre> : null}
      </section>
    </main>
  );
}

export default App;
