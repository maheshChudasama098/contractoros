"use client";

import VisibilityOffOutlined from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlined from "@mui/icons-material/VisibilityOutlined";
import Checkbox from "@mui/material/Checkbox";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import MenuItem from "@mui/material/MenuItem";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField, { type TextFieldProps } from "@mui/material/TextField";
import { useField } from "formik";
import { useState, type ReactNode } from "react";

/**
 * Label sits above the input (design pattern), so we render our own FormLabel
 * instead of MUI's floating label.
 */
type FieldProps = Omit<TextFieldProps, "name" | "label"> & { name: string; label?: ReactNode; hint?: ReactNode };

export function FormikTextField({ name, label, hint, helperText, ...props }: FieldProps) {
  const [field, meta] = useField(name);
  const showError = meta.touched && !!meta.error;
  return (
    <Stack gap={0.75} sx={{ width: props.fullWidth === false ? undefined : "100%" }}>
      {label && <FormLabel htmlFor={props.id ?? name} error={showError}>{label}</FormLabel>}
      <TextField
        id={props.id ?? name}
        {...field}
        value={field.value ?? ""}
        error={showError}
        helperText={showError ? meta.error : (helperText ?? hint)}
        fullWidth
        {...props}
      />
    </Stack>
  );
}

/** Password input with a show/hide toggle. */
export function FormikPasswordField(props: Omit<FieldProps, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <FormikTextField
      {...props}
      type={visible ? "text" : "password"}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={visible ? "Hide password" : "Show password"}
                aria-pressed={visible}
                onClick={() => setVisible((v) => !v)}
                onMouseDown={(e) => e.preventDefault()}
                edge="end"
                size="small"
              >
                {visible ? <VisibilityOffOutlined fontSize="small" /> : <VisibilityOutlined fontSize="small" />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function FormikSelect({
  name,
  label,
  options,
  hint,
  ...props
}: FieldProps & { options: (string | { value: string; label: ReactNode })[] }) {
  return (
    <FormikTextField name={name} label={label} hint={hint} select {...props}>
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        );
      })}
    </FormikTextField>
  );
}

export function FormikCheckbox({ name, label }: { name: string; label: ReactNode }) {
  const [field, meta] = useField({ name, type: "checkbox" });
  return (
    <FormControl error={meta.touched && !!meta.error}>
      <FormControlLabel control={<Checkbox {...field} checked={!!field.value} />} label={label} sx={{ "& .MuiFormControlLabel-label": { fontSize: 14 } }} />
      {meta.touched && meta.error && <FormHelperText>{meta.error}</FormHelperText>}
    </FormControl>
  );
}

export function FormikSwitch({ name, label, description }: { name: string; label: ReactNode; description?: ReactNode }) {
  const [field] = useField({ name, type: "checkbox" });
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} sx={{ py: 1 }}>
      <Stack>
        <span style={{ fontWeight: 500 }}>{label}</span>
        {description && <span style={{ fontSize: 13, color: "#5E636E" }}>{description}</span>}
      </Stack>
      <Switch {...field} checked={!!field.value} inputProps={{ "aria-label": typeof label === "string" ? label : undefined }} />
    </Stack>
  );
}

export function FormikRadioGroup({
  name,
  label,
  options,
  row,
}: {
  name: string;
  label?: ReactNode;
  options: { value: string; label: ReactNode }[];
  row?: boolean;
}) {
  const [field, meta] = useField(name);
  return (
    <FormControl error={meta.touched && !!meta.error}>
      {label && <FormLabel sx={{ mb: 0.75 }}>{label}</FormLabel>}
      <RadioGroup {...field} row={row}>
        {options.map((o) => (
          <FormControlLabel key={o.value} value={o.value} control={<Radio size="small" />} label={o.label} />
        ))}
      </RadioGroup>
      {meta.touched && meta.error && <FormHelperText>{meta.error}</FormHelperText>}
    </FormControl>
  );
}

/** Responsive grid for form fields. */
export function FieldRow({ children, min = 180 }: { children: ReactNode; min?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap: 16 }}>
      {children}
    </div>
  );
}
