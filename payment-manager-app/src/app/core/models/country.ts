export interface CountryData {
  name: string;
  Iso2: string;
}

interface State {
  name: string;
  state_code: string;
}

export interface StateData {
  states: State[];
}

export interface CurrencyData {
  currency: string;
}
