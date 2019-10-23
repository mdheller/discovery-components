/**
 * @class SearchInput
 */

import React, {
  FC,
  useContext,
  useEffect,
  useState,
  ReactNode,
  SyntheticEvent,
  KeyboardEvent
} from 'react';
import { settings } from 'carbon-components';
import { Search as CarbonSearchInput, Button as CarbonButton } from 'carbon-components-react';
import ListBox from 'carbon-components-react/lib/components/ListBox';
import { SearchApi, SearchContext } from '../DiscoverySearch/DiscoverySearch';
import useDebounce from '../../utils/useDebounce';
import uuid from 'uuid';
import Search16 from '@carbon/icons-react/lib/search/16.js';
import DiscoveryV1 from '@disco-widgets/ibm-watson/discovery/v1';
import { useDeepCompareCallback } from '../../utils/useDeepCompareMemoize';

interface SearchInputProps {
  /**
   * True to use small variant of Search
   */
  small?: boolean;
  /**
   * Placeholder text for the SearchInput
   */
  placeHolderText?: string;
  /**
   * className to style SearchInput
   */
  className?: string;
  /**
   * Label text for the SearchInput
   */
  labelText?: ReactNode;
  /**
   * True to use the light theme
   */
  light?: boolean;
  /**
   * Label text for the close button
   */
  closeButtonLabelText?: string;
  /**
   * ID for the SearchInput
   */
  id?: string;
  /**
   * Value to split words in the search query (Default: ' ')
   */
  splitSearchQuerySelector?: string;
  /**
   * Number of autocomplete suggestions to show in the autocomplete dropdown (default: 5)
   */
  completionsCount?: number;
  /**
   * Prop to show/hide the autocomplete dropdown (default: true)
   */
  showAutocomplete?: boolean;
  /**
   * Minimum number of characters present in the last word before the SearchInput fetches autocomplete suggestions
   */
  minCharsToAutocomplete?: number;
  /*
   * True to return spelling suggestion with results
   */
  spellingSuggestions?: boolean;
  /**
   * Message prefix used when displaying spelling suggestion
   */
  spellingSuggestionsPrefix?: string;
}

export const SearchInput: FC<SearchInputProps> = props => {
  const {
    small,
    placeHolderText,
    className,
    labelText = 'Search',
    light,
    closeButtonLabelText,
    id,
    splitSearchQuerySelector = ' ' as string,
    completionsCount = 5,
    showAutocomplete = true,
    minCharsToAutocomplete = 0,
    spellingSuggestions,
    spellingSuggestionsPrefix = 'Did you mean:'
  } = props;

  const inputId = id || `search-input__${uuid.v4()}`;
  const autocompletionClassName = `${settings.prefix}--search-autocompletion`;
  const spellingSuggestionClassName = `${settings.prefix}--spelling-suggestion`;
  const spellingSuggestionWrapperClassName = `${settings.prefix}--spelling-suggestion__wrapper`;
  const { searchParameters, searchResponse, autocompletionResults } = useContext(SearchContext);
  const {
    performSearch,
    fetchAutocompletions,
    setAutocompletionOptions,
    setSearchParameters
  } = useContext(SearchApi);
  const [value, setValue] = useState(searchParameters.natural_language_query || '');
  const completions = (autocompletionResults && autocompletionResults.completions) || [];
  const lastWordOfValue = value.split(splitSearchQuerySelector).pop();
  const [skipFetchAutoCompletions, setSkipFetchAutoCompletions] = useState(false);
  const suggestedQuery = searchResponse && searchResponse.suggested_query;
  const [focused, setFocused] = useState(false);
  let focusTimeout: ReturnType<typeof setTimeout>;

  const handleOnChange = (evt: SyntheticEvent<EventTarget>): void => {
    const target = evt.currentTarget as HTMLInputElement;
    setValue(!!target ? target.value : '');
  };

  const selectAutocompletion = (i: number): void => {
    const valueArray = value.split(splitSearchQuerySelector);
    const prefix = valueArray.pop();
    const completionValue = !!completions ? completions[i] : prefix;
    valueArray.push(completionValue || '');
    setValue(`${valueArray.join(splitSearchQuerySelector)}${splitSearchQuerySelector}`);

    // The carbon Search component doesn't seem to use ForwardRef
    // so looking up by ID for now.
    const searchInput = document.getElementById(`${inputId}_input_field`);
    if (searchInput !== null) {
      searchInput.focus();
    }
  };

  const prepareFreshSearchParameters = useDeepCompareCallback(
    (nlq: string): DiscoveryV1.QueryParams => {
      return {
        ...searchParameters,
        natural_language_query: nlq,
        offset: 0,
        filter: ''
      };
    },
    [searchParameters]
  );

  const setupHandleAutocompletionKeyUp = (i: number) => {
    return (evt: KeyboardEvent<EventTarget>): void => {
      if (evt.key === 'Enter') {
        selectAutocompletion(i);
      }
    };
  };

  const setupHandleAutocompletionOnClick = (i: number) => {
    return (): void => {
      selectAutocompletion(i);
    };
  };

  const searchAndBlur = (value: string): void => {
    performSearch(prepareFreshSearchParameters(value));

    // The carbon Search component doesn't seem to use ForwardRef
    // so looking up by ID for now.
    const searchInput = document.getElementById(`${inputId}_input_field`);
    if (searchInput !== null) {
      searchInput.blur();
    }
  };

  const debouncedSearchTerm = useDebounce(value, 500);
  useEffect(() => {
    setSearchParameters((currentSearchParameters: DiscoveryV1.QueryParams) => {
      return {
        ...currentSearchParameters,
        natural_language_query: debouncedSearchTerm
      };
    });

    if (!skipFetchAutoCompletions) {
      fetchAutocompletions(debouncedSearchTerm);
    } else {
      setSkipFetchAutoCompletions(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, fetchAutocompletions, setSearchParameters]);

  useEffect(() => {
    setAutocompletionOptions({
      updateAutocompletions: showAutocomplete,
      completionsCount: completionsCount,
      minCharsToAutocomplete: minCharsToAutocomplete,
      splitSearchQuerySelector: splitSearchQuerySelector
    });
  }, [
    showAutocomplete,
    completionsCount,
    minCharsToAutocomplete,
    splitSearchQuerySelector,
    setAutocompletionOptions
  ]);

  useEffect(() => {
    setSearchParameters((currentSearchParameters: DiscoveryV1.QueryParams) => {
      return { ...currentSearchParameters, spelling_suggestions: !!spellingSuggestions };
    });
  }, [setSearchParameters, spellingSuggestions]);

  const handleOnKeyUp = (evt: KeyboardEvent<EventTarget>): void => {
    if (evt.key === 'Enter') {
      searchAndBlur(value);
    }
  };

  // onFocus for the carbon search component and the autocomplete dropdown
  const handleOnFocus = (): void => {
    // cancel the timeout set in handleOnBlur
    clearTimeout(focusTimeout);
    setFocused(true);
  };

  // onBlur for the entire SearchInput
  const handleOnBlur = (): void => {
    focusTimeout = setTimeout(() => {
      setFocused(false);
    }, 0);
  };

  const selectSuggestion = (evt: SyntheticEvent<EventTarget>): void => {
    evt.preventDefault();
    if (!!suggestedQuery) {
      setSkipFetchAutoCompletions(true);
      setValue(suggestedQuery);
      searchAndBlur(suggestedQuery);
    }
  };

  const shouldShowCompletions = lastWordOfValue !== '' && showAutocomplete && focused;
  const autocompletionsList = completions.map((completion, i) => {
    const suffix = completion.slice((lastWordOfValue as string).length);
    return (
      <ListBox key={`autocompletion_${i}`} className={`${autocompletionClassName}__wrapper`}>
        <ListBox.Field
          role="listitem"
          id={`autocompletion_${i}_field`}
          tabIndex="0"
          className={`${autocompletionClassName}__item`}
          onClick={setupHandleAutocompletionOnClick(i)}
          onKeyUp={setupHandleAutocompletionKeyUp(i)}
        >
          <div className={`${autocompletionClassName}__icon`}>
            <Search16 />
          </div>
          <div className={`${autocompletionClassName}__term`}>
            <strong>{value}</strong>
            {suffix}
          </div>
        </ListBox.Field>
      </ListBox>
    );
  });

  return (
    <div
      className={className}
      id={inputId}
      data-testid="search-input-test-id"
      onBlur={handleOnBlur}
    >
      <div onFocus={handleOnFocus}>
        <CarbonSearchInput
          small={small}
          placeHolderText={placeHolderText}
          onKeyUp={handleOnKeyUp}
          onChange={handleOnChange}
          labelText={labelText}
          light={light}
          closeButtonLabelText={closeButtonLabelText}
          value={value}
          id={`${inputId}_input_field`}
        />
        {shouldShowCompletions && (
          <div className={autocompletionClassName} data-testid="completions-dropdown-test-id">
            {autocompletionsList}
          </div>
        )}
      </div>
      {!!suggestedQuery && (
        <div className={spellingSuggestionWrapperClassName}>
          {spellingSuggestionsPrefix}
          <CarbonButton
            className={spellingSuggestionClassName}
            onClick={selectSuggestion}
            kind="ghost"
            size="small"
          >
            {suggestedQuery}
          </CarbonButton>
        </div>
      )}
    </div>
  );
};

export default SearchInput;
