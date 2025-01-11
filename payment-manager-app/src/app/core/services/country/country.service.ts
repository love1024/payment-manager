import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, of } from 'rxjs';
import { CountryData, CurrencyData, StateData } from '../../models/country';
import { NullableString } from '@app/core/constants';

@Injectable({ providedIn: 'root' })
export class CountryService {
  private http = inject(HttpClient);
  private BASE_API_URL = 'https://countriesnow.space/api/v0.1';

  // Cache results
  private countries: CountryData[] = [];
  private stateMap = new Map<string, string[]>();
  private citiesMap = new Map<string, string[]>(); // Key here is country-state if state is avilable, otherwise country
  private currency = new Map<string, string>();

  getCountries(): Observable<CountryData[]> {
    if (this.countries.length > 0) {
      return of(this.countries);
    }
    return this.http
      .get<{ data: CountryData[] }>(`${this.BASE_API_URL}/countries/iso`)
      .pipe(
        map(r => {
          this.countries = r.data;
          return r.data;
        })
      );
  }

  getStates(country: string): Observable<string[]> {
    const states = this.stateMap.get(country);
    if (states) {
      return of(states);
    }
    return this.http
      .post<{
        data: StateData;
      }>(`${this.BASE_API_URL}/countries/states`, { country })
      .pipe(
        map(r => {
          const data = r.data.states.map(d => d.name);
          this.stateMap.set(country, data);
          return data;
        })
      );
  }

  getCities(country: string): Observable<string[]> {
    const cities = this.citiesMap.get(country);
    if (cities) {
      return of(cities);
    }
    return this.http
      .post<{
        data: string[];
      }>(`${this.BASE_API_URL}/countries/cities`, { country })
      .pipe(
        map(r => {
          this.citiesMap.set(country, r.data);
          return r.data;
        })
      );
  }

  getStateCities(country: string, state: NullableString): Observable<string[]> {
    const key = `${country}${state ? '-' + state : ''}`;
    const cities = this.citiesMap.get(key);
    if (cities) {
      return of(cities);
    }
    return this.http
      .post<{
        data: string[];
      }>(`${this.BASE_API_URL}/countries/state/cities`, { country, state })
      .pipe(
        map(r => {
          this.citiesMap.set(key, r.data);
          return r.data;
        })
      );
  }

  getCurrency(country: string): Observable<string> {
    const currency = this.currency.get(country);
    if (currency) {
      return of(currency);
    }
    return this.http
      .post<{
        data: CurrencyData;
      }>(`${this.BASE_API_URL}/countries/currency`, { country })
      .pipe(
        map(r => {
          this.currency.set(country, r.data.currency);
          return r.data.currency;
        })
      );
  }
}
