"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Muted } from "@web/components/ui";

export function DashboardView() {
  return (
    <Box>
      <Typography variant="h1" sx={{ fontSize: 24, fontWeight: 600, mb: 1 }}>
        Welcome to ContractorOS
      </Typography>
      <Muted>Your dashboard is ready. Modules will appear here as they are built.</Muted>
    </Box>
  );
}
