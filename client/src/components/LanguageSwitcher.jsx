import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Globe, Check } from 'lucide-react';

const languages = [
  { code: 'he', label: 'עִברִית', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
];

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.dir = languages.find((lang) => lang.code === i18n.language)?.dir || 'ltr';
  }, [i18n.language]);

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('mikveh-lang', code);
    setOpen(false);
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-900/90 px-4 py-3 text-slate-100 shadow-soft transition hover:border-slate-500 hover:bg-slate-800"
        >
          <Globe className="h-5 w-5" />
          <span className="text-sm font-medium">{t('language.label')}</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[180px] rounded-3xl border border-slate-800/80 bg-slate-950 p-2 shadow-soft"
        >
          {languages.map((lang) => (
            <DropdownMenu.Item
              key={lang.code}
              onSelect={() => handleChange(lang.code)}
              className="group flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3 text-sm text-slate-100 outline-none transition hover:bg-slate-800"
            >
              <span>{lang.label}</span>
              {i18n.language === lang.code ? <Check className="h-4 w-4 text-emerald-400" /> : null}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
