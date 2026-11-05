"use client";

import CheckCircleOutline from "@mui/icons-material/CheckCircleOutline";
import PrintOutlined from "@mui/icons-material/PrintOutlined";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Muted } from "@web/components/ui";
import { tokens } from "@web/theme/tokens";
import { ApiClientError, api } from "@web/lib/api-client";
import { CONSENT_TEXT, type PortalProposal, type PortalSignature } from "@shared/contracts/proposals";
import { usd } from "@web/features/invoices/api";
import { fmtDay, fmtWhen } from "@web/features/estimates/api";
import { QuoteDocument } from "@web/features/estimates/QuoteDocument";
import { ContractDocumentView } from "@web/features/contracts/ContractDetailView";

const post = <T,>(path: string, body: unknown) => api<T>(path, { method: "POST", body: JSON.stringify(body) });
const errText = (e: unknown) => {
  if (e instanceof ApiClientError) {
    const fe = e.body.field_errors && Object.values(e.body.field_errors)[0]?.[0];
    return fe ?? (e.status === 404 ? "This link isn't valid anymore. Ask your contractor for a new one." : e.body.message);
  }
  return "Something went wrong. Please try again.";
};

function Shell({ from, children }: { from?: { name: string; logo_url: string | null }; children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F3F3F0", py: { xs: 2, sm: 5 }, px: 2, "@media print": { bgcolor: "#fff", p: 0 } }}>
      <Stack sx={{ maxWidth: 860, mx: "auto" }} gap={2.5}>
        {from && (
          <Stack direction="row" alignItems="center" gap={1.5} sx={{ "@media print": { display: "none" } }}>
            {from.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element -- token-scoped API image
              <img src={from.logo_url} alt="" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 6 }} />
            )}
            <Typography sx={{ fontWeight: 600 }}>{from.name}</Typography>
          </Stack>
        )}
        {children}
        <Muted sx={{ fontSize: 12, textAlign: "center", "@media print": { display: "none" } }}>Secure link sent by {from?.name ?? "your contractor"} · Powered by ContractorOS</Muted>
      </Stack>
    </Box>
  );
}

function Loading({ error }: { error: string | null }) {
  return (
    <Shell>
      {error ? (
        <Card sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="h2" sx={{ mb: 1 }}>
            Link not available
          </Typography>
          <Muted>{error}</Muted>
        </Card>
      ) : (
        <CircularProgress sx={{ mx: "auto", mt: 10 }} />
      )}
    </Shell>
  );
}

function ActionCard({ children }: { children: ReactNode }) {
  return <Card sx={{ p: { xs: 2.5, sm: 3 }, "@media print": { display: "none" } }}>{children}</Card>;
}

// ---------------------------------------------------------------- proposal

export function PortalProposalView({ token }: { token: string }) {
  const [p, setP] = useState<PortalProposal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "accept" | "decline">("view");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agree, setAgree] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const base = `/portal/proposals/${token}`;

  useEffect(() => {
    api<PortalProposal>(base)
      .then((d) => {
        setP(d);
        setName(d.customer.name);
        setEmail(d.customer.email ?? "");
        document.title = `${d.estimate.title} · ${d.from.name}`;
      })
      .catch((e) => setError(errText(e)));
  }, [base]);

  if (!p) return <Loading error={error} />;

  const act = async (fn: () => Promise<PortalProposal>) => {
    setBusy(true);
    setFormError(null);
    try {
      setP(await fn());
      setMode("view");
    } catch (e) {
      setFormError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const open = p.status === "sent";

  return (
    <Shell from={p.from}>
      {p.status === "accepted" && (
        <Alert severity="success" icon={<CheckCircleOutline />}>
          Accepted by {p.accepted_by_name} on {fmtWhen(p.accepted_at)}. {p.from.name} will send you the contract to sign next.
        </Alert>
      )}
      {p.status === "declined" && <Alert severity="info">You declined this proposal on {fmtWhen(p.declined_at)}. Thanks for letting us know.</Alert>}
      {p.status === "expired" && <Alert severity="warning">This proposal expired on {fmtDay(p.expires_at)}. Contact {p.from.name} for an updated one.</Alert>}
      {p.status === "withdrawn" && <Alert severity="warning">{p.from.name} withdrew this proposal. They may have sent you a newer version.</Alert>}

      {p.message && (
        <Card sx={{ p: 2.5, borderLeft: `4px solid ${tokens.brand}` }}>
          <Muted sx={{ fontSize: 12, mb: 0.5 }}>Message from {p.from.name}</Muted>
          <Box sx={{ whiteSpace: "pre-wrap" }}>{p.message}</Box>
        </Card>
      )}

      {open && mode === "view" && (
        <ActionCard>
          <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} justifyContent="space-between" gap={2}>
            <Stack>
              <Typography sx={{ fontWeight: 600, fontSize: 18 }}>{usd(p.total)}</Typography>
              <Muted sx={{ fontSize: 13 }}>{p.expires_at ? `Please respond by ${fmtDay(p.expires_at)}` : "Review the details below"}</Muted>
            </Stack>
            <Stack direction="row" gap={1}>
              <Button onClick={() => setMode("decline")}>Decline</Button>
              <Button variant="contained" color="primary" size="large" onClick={() => setMode("accept")}>
                Accept proposal
              </Button>
            </Stack>
          </Stack>
        </ActionCard>
      )}

      {open && mode === "accept" && (
        <ActionCard>
          <Stack gap={2}>
            <Typography variant="h3">Accept {p.estimate.title}</Typography>
            {formError && <Alert severity="error">{formError}</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} gap={2}>
              <TextField label="Your full name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoComplete="name" />
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth autoComplete="email" />
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={agree} onChange={(e) => setAgree(e.target.checked)} />}
              label={`I accept this proposal for ${usd(p.total)}. I understand a contract will follow for signature.`}
            />
            <Stack direction="row" gap={1} justifyContent="flex-end">
              <Button onClick={() => setMode("view")}>Back</Button>
              <Button
                variant="contained"
                color="primary"
                disabled={busy || !agree || name.trim().length < 2 || !email.includes("@")}
                onClick={() => act(() => post(`${base}/accept`, { name: name.trim(), email: email.trim(), agree: true }))}
              >
                Accept
              </Button>
            </Stack>
          </Stack>
        </ActionCard>
      )}

      {open && mode === "decline" && (
        <ActionCard>
          <Stack gap={2}>
            <Typography variant="h3">Decline this proposal?</Typography>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Anything you'd like to share? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
            <Stack direction="row" gap={1} justifyContent="flex-end">
              <Button onClick={() => setMode("view")}>Back</Button>
              <Button variant="contained" color="error" disabled={busy} onClick={() => act(() => post(`${base}/decline`, { reason: reason.trim() || null }))}>
                Decline
              </Button>
            </Stack>
          </Stack>
        </ActionCard>
      )}

      <QuoteDocument
        kind="Proposal"
        number={`${p.proposal_number} · ${p.estimate.estimate_number}`}
        logoUrl={p.from.logo_url}
        from={p.from}
        to={p.customer}
        meta={[
          { k: "Date", v: fmtDay(p.sent_at) },
          ...(p.expires_at ? [{ k: "Valid until", v: fmtDay(p.expires_at) }] : []),
          { k: "Total", v: usd(p.total), strong: true },
        ]}
        title={p.estimate.title}
        intro={p.estimate.scope_description}
        items={p.items}
        totals={p}
        sections={[
          { heading: "Notes", body: p.estimate.customer_notes },
          { heading: "Terms", body: p.estimate.terms, muted: true },
        ]}
        stamp={p.status === "accepted" ? { text: "Accepted", color: "#15803D" } : null}
      />
      <Button startIcon={<PrintOutlined />} onClick={() => window.print()} sx={{ alignSelf: "center", "@media print": { display: "none" } }}>
        Print or save as PDF
      </Button>
    </Shell>
  );
}

// ---------------------------------------------------------------- signature

export function PortalSignView({ token }: { token: string }) {
  const [s, setS] = useState<PortalSignature | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<"typed" | "drawn">("typed");
  const [image, setImage] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const base = `/portal/signatures/${token}`;

  useEffect(() => {
    api<PortalSignature>(base)
      .then((d) => {
        setS(d);
        setName(d.signer_name);
        if (d.document?.title) document.title = `Sign: ${d.document.title}`;
      })
      .catch((e) => setError(errText(e)));
  }, [base]);

  if (!s) return <Loading error={error} />;

  const act = async (fn: () => Promise<PortalSignature>) => {
    setBusy(true);
    setFormError(null);
    try {
      setS(await fn());
      setDeclining(false);
    } catch (e) {
      setFormError(errText(e));
    } finally {
      setBusy(false);
    }
  };
  const ready = consent && name.trim().length >= 2 && (type === "typed" || !!image);
  const hasDoc = !!s.document?.contract_number;

  return (
    <Shell from={s.from}>
      {s.status === "signed" && (
        <Alert severity="success" icon={<CheckCircleOutline />}>
          Signed by {s.signed?.signed_name} on {fmtWhen(s.signed?.signed_at ?? null)}. Keep this page or print a copy for your records.
        </Alert>
      )}
      {s.status === "declined" && <Alert severity="info">You declined to sign. {s.from.name} has been notified and may send a revised contract.</Alert>}
      {s.status === "expired" && <Alert severity="warning">This signing link has expired or was replaced. Ask {s.from.name} to send it again.</Alert>}
      {s.status === "voided" && <Alert severity="warning">{s.from.name} cancelled this contract.</Alert>}

      {hasDoc && (s.status === "pending" || s.status === "signed") && (
        <ContractDocumentView doc={s.document} logoUrl={s.from.logo_url} signed={s.signed} signerName={s.signer_name} stamp={s.status === "signed" ? { text: "Signed", color: "#15803D" } : null} />
      )}

      {s.status === "pending" && !declining && (
        <ActionCard>
          <Stack gap={2}>
            <Typography variant="h3">Sign the contract</Typography>
            <Muted sx={{ fontSize: 13.5 }}>
              Signing as {s.signer_name} ({s.signer_email}). Contract price {usd(s.document.total)}.
            </Muted>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="Full legal name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <ToggleButtonGroup exclusive value={type} onChange={(_, v) => v && setType(v)} aria-label="Signature type" size="small">
              <ToggleButton value="typed">Type</ToggleButton>
              <ToggleButton value="drawn">Draw</ToggleButton>
            </ToggleButtonGroup>
            {type === "typed" ? (
              <Box sx={{ height: 90, border: `1px dashed ${tokens.borderStrong}`, borderRadius: "10px", display: "flex", alignItems: "center", px: 3, bgcolor: "#fff" }}>
                <Box sx={{ fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontSize: 38, color: tokens.ink, overflow: "hidden", whiteSpace: "nowrap" }}>
                  {name || "Your name"}
                </Box>
              </Box>
            ) : (
              <SignaturePad onChange={setImage} />
            )}
            <FormControlLabel control={<Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />} label={CONSENT_TEXT} sx={{ alignItems: "flex-start", "& .MuiCheckbox-root": { pt: 0.25 } }} />
            <Stack direction="row" gap={1} justifyContent="space-between" flexWrap="wrap">
              <Button color="inherit" onClick={() => setDeclining(true)} sx={{ color: "text.secondary" }}>
                Decline to sign
              </Button>
              <Button
                variant="contained"
                color="primary"
                size="large"
                disabled={busy || !ready}
                onClick={() =>
                  act(() =>
                    post(`${base}/sign`, {
                      signed_name: name.trim(),
                      signature_type: type,
                      signature_image: type === "drawn" ? image : null,
                      document_hash: s.document_hash,
                      consent: true,
                    }),
                  )
                }
              >
                Sign contract
              </Button>
            </Stack>
          </Stack>
        </ActionCard>
      )}

      {s.status === "pending" && declining && (
        <ActionCard>
          <Stack gap={2}>
            <Typography variant="h3">Decline to sign?</Typography>
            {formError && <Alert severity="error">{formError}</Alert>}
            <TextField label="What should change? (optional)" value={reason} onChange={(e) => setReason(e.target.value)} multiline minRows={2} />
            <Stack direction="row" gap={1} justifyContent="flex-end">
              <Button onClick={() => setDeclining(false)}>Back</Button>
              <Button variant="contained" color="error" disabled={busy} onClick={() => act(() => post(`${base}/decline`, { reason: reason.trim() || null }))}>
                Decline
              </Button>
            </Stack>
          </Stack>
        </ActionCard>
      )}

      {s.status === "signed" && (
        <Button startIcon={<PrintOutlined />} onClick={() => window.print()} sx={{ alignSelf: "center", "@media print": { display: "none" } }}>
          Print or save as PDF
        </Button>
      )}
    </Shell>
  );
}

/** Mouse/touch/pen signature pad. Emits a PNG data URL, or null when cleared/empty. */
function SignaturePad({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const dirty = useRef(false);

  const setup = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1F2937";
  }, []);
  useEffect(setup, [setup]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const clear = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    dirty.current = false;
    onChange(null);
  };

  return (
    <Stack gap={0.75}>
      <Box
        component="canvas"
        ref={canvas}
        aria-label="Draw your signature"
        onPointerDown={(e: React.PointerEvent<HTMLCanvasElement>) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = true;
          const { x, y } = point(e);
          const ctx = e.currentTarget.getContext("2d")!;
          ctx.beginPath();
          ctx.moveTo(x, y);
        }}
        onPointerMove={(e: React.PointerEvent<HTMLCanvasElement>) => {
          if (!drawing.current) return;
          const { x, y } = point(e);
          const ctx = e.currentTarget.getContext("2d")!;
          ctx.lineTo(x, y);
          ctx.stroke();
          dirty.current = true;
        }}
        onPointerUp={() => {
          drawing.current = false;
          if (dirty.current) onChange(canvas.current!.toDataURL("image/png"));
        }}
        sx={{ width: "100%", height: 150, border: `1px dashed ${tokens.borderStrong}`, borderRadius: "10px", bgcolor: "#fff", touchAction: "none", cursor: "crosshair" }}
      />
      <Stack direction="row" justifyContent="space-between">
        <Muted sx={{ fontSize: 12 }}>Sign with your mouse, finger or stylus.</Muted>
        <Button size="small" onClick={clear}>
          Clear
        </Button>
      </Stack>
    </Stack>
  );
}
