import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api-base';
import { ThemeConfig } from '../theme/theme.models';

@Injectable({ providedIn: 'root' })
export class MePreferencesService {
  private http = inject(HttpClient);
  private readonly base = `${API_BASE_URL}/me/preferences`;

  getTheme(): Observable<ThemeConfig> {
    return this.http.get<ThemeConfig>(this.base);
  }

  patchTheme(partial: Partial<ThemeConfig>): Observable<ThemeConfig> {
    return this.http.patch<ThemeConfig>(this.base, partial);
  }
}
