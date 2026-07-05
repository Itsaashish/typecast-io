import { Injectable, signal } from '@angular/core';

export type ThemeType = 'dark' | 'light' | 'slate' | 'coffee' | 'cupcake' | 'synthwave' | 'dracula' | 'nord';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  public currentTheme = signal<ThemeType>('dark'); // Default to dark

  constructor() {
    const storedTheme = localStorage.getItem('theme-preference') as ThemeType;
    if (storedTheme && ['dark', 'light', 'slate', 'coffee', 'cupcake', 'synthwave', 'dracula', 'nord'].includes(storedTheme)) {
      this.currentTheme.set(storedTheme);
    } else {
      this.currentTheme.set('dark');
    }
    this.applyTheme();
  }

  public setTheme(theme: ThemeType): void {
    this.currentTheme.set(theme);
    localStorage.setItem('theme-preference', theme);
    this.applyTheme();
  }

  public toggleTheme(): void {
    const current = this.currentTheme();
    const themesList: ThemeType[] = ['dark', 'light', 'slate', 'coffee', 'cupcake', 'synthwave', 'dracula', 'nord'];
    const idx = themesList.indexOf(current);
    const next = themesList[(idx + 1) % themesList.length];
    this.setTheme(next);
  }

  public isDark(): boolean {
    const t = this.currentTheme();
    return ['dark', 'slate', 'coffee', 'synthwave', 'dracula'].includes(t);
  }

  private applyTheme(): void {
    const root = document.documentElement;
    const theme = this.currentTheme();
    
    // Reset data-theme attribute and classes
    root.classList.remove('dark', 'light', 'slate', 'coffee', 'cupcake', 'synthwave', 'dracula', 'nord');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  }
}
