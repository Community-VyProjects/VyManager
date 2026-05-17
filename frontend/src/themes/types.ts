export interface ThemeDefinition {
  id: string;
  name: string;
  isDark: boolean;
  isCustom?: boolean;
  variables: Record<string, string>;
}
