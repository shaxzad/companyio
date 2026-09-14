import { useState } from 'react';
import { ChevronDownIcon } from '../../icons';

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  options: Option[];
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
  defaultValue?: string;
  value?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  placeholder = 'Select an option',
  onChange,
  className = '',
  defaultValue = '',
  value,
  disabled = false,
  id,
  name,
}) => {
  const [internalValue, setInternalValue] = useState<string>(defaultValue);
  const selectedValue = value ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value;
    setInternalValue(next);
    onChange(next);
  };

  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        disabled={disabled}
        className={`h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-11 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:focus:border-brand-800 ${
          selectedValue ? 'text-gray-800 dark:text-white/90' : 'text-gray-400 dark:text-gray-400'
        } ${className}`}
        value={selectedValue}
        onChange={handleChange}
      >
        <option value="" disabled className="text-gray-500 dark:bg-gray-900 dark:text-gray-400">
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="text-gray-800 dark:bg-gray-900 dark:text-gray-200"
          >
            {option.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-500 dark:text-gray-400">
        <ChevronDownIcon className="size-5" />
      </span>
    </div>
  );
};

export default Select;
