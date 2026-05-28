import { forwardRef, useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cx } from './cx';

type FieldLayout = 'stack' | 'inline';
type FieldVariant = 'default' | 'accent';

export type FieldProps = {
  id?: string;
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  layout?: FieldLayout;
  variant?: FieldVariant;
  className?: string;
  children: (field: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
};

const controlClasses = cx(
  'w-full rounded-lg border border-white/[0.08] bg-white/[0.04] text-on-surface outline-none transition-colors',
  'placeholder:text-on-surface-variant/55',
  'focus:border-lime/45 focus:bg-white/[0.06] focus:ring-2 focus:ring-lime/20',
  'disabled:pointer-events-none disabled:opacity-45',
  'aria-[invalid=true]:border-error/45 aria-[invalid=true]:focus:ring-error/20',
);

export type TextInputControlProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  unstyled?: boolean;
};

export const TextInputControl = forwardRef<HTMLInputElement, TextInputControlProps>(function TextInputControl(
  { className, invalid = false, unstyled = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(unstyled ? '' : controlClasses, !unstyled && 'h-11 px-3 text-sm', className)}
      {...props}
    />
  );
});

export type TextareaControlProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  unstyled?: boolean;
};

export const TextareaControl = forwardRef<HTMLTextAreaElement, TextareaControlProps>(function TextareaControl(
  { className, invalid = false, unstyled = false, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(unstyled ? '' : controlClasses, !unstyled && 'min-h-28 resize-y px-3 py-2 text-sm leading-6', className)}
      {...props}
    />
  );
});

export type SelectControlProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
  unstyled?: boolean;
};

export const SelectControl = forwardRef<HTMLSelectElement, SelectControlProps>(function SelectControl(
  { className, invalid = false, unstyled = false, children, ...props },
  ref,
) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cx(unstyled ? '' : controlClasses, !unstyled && 'h-11 px-3 text-sm', className)}
      {...props}
    >
      {children}
    </select>
  );
});

export type CheckboxControlProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  invalid?: boolean;
};

export const CheckboxControl = forwardRef<HTMLInputElement, CheckboxControlProps>(function CheckboxControl(
  { className, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-invalid={invalid || undefined}
      className={cx(
        'h-4 w-4 shrink-0 accent-secondary outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-secondary/35',
        'disabled:pointer-events-none disabled:opacity-45',
        className,
      )}
      {...props}
    />
  );
});

export type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(function FileInput(
  { className = 'hidden', ...props },
  ref,
) {
  return <input ref={ref} type="file" className={className} {...props} />;
});

export function Field({
  id: providedId,
  label,
  helpText,
  error,
  required = false,
  layout = 'stack',
  variant = 'default',
  className,
  children,
}: FieldProps) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(error);

  const fieldClassName =
    variant === 'accent'
      ? 'flex flex-col gap-2'
      : layout === 'inline'
        ? 'grid gap-2 sm:grid-cols-[160px_minmax(0,1fr)] sm:items-start'
        : 'grid gap-1.5';
  const labelClassName =
    variant === 'accent'
      ? 'mb-1 text-[10px] font-bold uppercase tracking-widest text-secondary'
      : 'text-xs font-medium leading-5 text-on-surface-variant';

  return (
    <div className={cx(fieldClassName, className)}>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {required ? <span className="ml-1 text-lime" aria-hidden="true">*</span> : null}
      </label>
      <div className="min-w-0">
        {children({ id, describedBy, invalid })}
        {helpText ? (
          <p id={helpId} className="mt-1.5 text-xs leading-5 text-on-surface-variant">
            {helpText}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="mt-1.5 text-xs leading-5 text-on-error-container">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  fieldClassName?: string;
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { className, fieldClassName, label, helpText, error, required, id, ...props },
  ref,
) {
  return (
    <Field id={id} label={label} helpText={helpText} error={error} required={required} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }) => (
        <TextInputControl
          ref={ref}
          id={fieldId}
          aria-describedby={describedBy}
          invalid={invalid}
          required={required}
          className={className}
          {...props}
        />
      )}
    </Field>
  );
});

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  fieldClassName?: string;
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
};

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  { className, fieldClassName, label, helpText, error, required, id, ...props },
  ref,
) {
  return (
    <Field id={id} label={label} helpText={helpText} error={error} required={required} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }) => (
        <TextareaControl
          ref={ref}
          id={fieldId}
          aria-describedby={describedBy}
          invalid={invalid}
          required={required}
          className={className}
          {...props}
        />
      )}
    </Field>
  );
});

export type SelectFieldOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
};

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  fieldClassName?: string;
  label: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  options: SelectFieldOption[];
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { className, fieldClassName, label, helpText, error, required, id, options, ...props },
  ref,
) {
  return (
    <Field id={id} label={label} helpText={helpText} error={error} required={required} className={fieldClassName}>
      {({ id: fieldId, describedBy, invalid }) => (
        <SelectControl
          ref={ref}
          id={fieldId}
          aria-describedby={describedBy}
          invalid={invalid}
          required={required}
          className={className}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </SelectControl>
      )}
    </Field>
  );
});
