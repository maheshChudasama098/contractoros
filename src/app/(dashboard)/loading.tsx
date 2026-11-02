import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";

// Shown instantly while the next dashboard route loads, so navigation never looks frozen.
export default function DashboardLoading() {
  return (
    <Box sx={{ p: 3 }}>
      <LinearProgress />
    </Box>
  );
}
