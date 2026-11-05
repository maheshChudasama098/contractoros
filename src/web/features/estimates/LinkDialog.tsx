"use client";

import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import OpenInNewOutlined from "@mui/icons-material/OpenInNewOutlined";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { Muted } from "@web/components/ui";

/** Shows a customer link once (only its hash is stored), so it can be shared until email sending exists. */
export function LinkDialog({ title, body, url, onClose }: { title: string; body: string; url: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack gap={2}>
          <Muted sx={{ fontSize: 14 }}>{body}</Muted>
          <TextField value={url} fullWidth InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} inputProps={{ "aria-label": "Customer link" }} />
          {copied && <Alert severity="success">Link copied. Paste it into an email or text message to your customer.</Alert>}
          <Alert severity="info">For security this link is shown only now. You can get a new link later — the old one then stops working.</Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button component="a" href={url} target="_blank" rel="noopener" startIcon={<OpenInNewOutlined />}>
          Preview
        </Button>
        <Button onClick={onClose}>Done</Button>
        <Button variant="contained" color="primary" startIcon={<ContentCopyOutlined />} onClick={copy}>
          Copy link
        </Button>
      </DialogActions>
    </Dialog>
  );
}
