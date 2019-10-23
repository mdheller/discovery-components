import * as React from 'react';
import { render, fireEvent, RenderResult } from '@testing-library/react';
import { wrapWithContext } from '../../../utils/testingUtils';
import { SearchContextIFC, SearchApiIFC } from '../../DiscoverySearch/DiscoverySearch';
import { SearchRefinements } from '../SearchRefinements';
import refinementsQueryResponse from '../fixtures/refinementsQueryResponse';

interface Setup {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  performSearchMock: jest.Mock<any, any>;
  fieldRefinementsComponent: RenderResult;
}

const setup = (filter: string): Setup => {
  const performSearchMock = jest.fn();
  const context: Partial<SearchContextIFC> = {
    aggregationResults: {
      aggregations: refinementsQueryResponse.aggregations
    },
    searchParameters: {
      project_id: '',
      filter: filter
    }
  };
  const api: Partial<SearchApiIFC> = {
    performSearch: performSearchMock
  };
  const fieldRefinementsComponent = render(
    wrapWithContext(
      <SearchRefinements
        configuration={[
          {
            field: 'author',
            count: 3
          },
          {
            field: 'subject',
            count: 4
          }
        ]}
      />,
      api,
      context
    )
  );
  return {
    performSearchMock,
    fieldRefinementsComponent
  };
};

describe('FieldRefinementsComponent', () => {
  describe('legend header elements', () => {
    test('contains first refinement header with author field text', () => {
      const { fieldRefinementsComponent } = setup('');
      const headerAuthorField = fieldRefinementsComponent.getByText('author');
      expect(headerAuthorField).toBeDefined();
    });

    test('contains second refinement header with subject field text', () => {
      const { fieldRefinementsComponent } = setup('');
      const headerSubjectField = fieldRefinementsComponent.getByText('subject');
      expect(headerSubjectField).toBeDefined();
    });
  });

  describe('checkbox elements', () => {
    test('contains first refinement checkboxes with correct labels', () => {
      const { fieldRefinementsComponent } = setup('');
      const ABMNStaffCheckbox = fieldRefinementsComponent.getByLabelText('ABMN Staff');
      const newsStaffCheckbox = fieldRefinementsComponent.getByLabelText('News Staff');
      const editorCheckbox = fieldRefinementsComponent.getByLabelText('editor');
      expect(ABMNStaffCheckbox).toBeDefined();
      expect(newsStaffCheckbox).toBeDefined();
      expect(editorCheckbox).toBeDefined();
    });

    test('contains second refinement checkboxes with correct labels', () => {
      const { fieldRefinementsComponent } = setup('');
      const animalsCheckbox = fieldRefinementsComponent.getByLabelText('Animals');
      const peopleCheckbox = fieldRefinementsComponent.getByLabelText('People');
      const placesCheckbox = fieldRefinementsComponent.getByLabelText('Places');
      const thingsCheckbox = fieldRefinementsComponent.getByLabelText('Things');
      expect(animalsCheckbox).toBeDefined();
      expect(peopleCheckbox).toBeDefined();
      expect(placesCheckbox).toBeDefined();
      expect(thingsCheckbox).toBeDefined();
    });

    test('checkboxes are unchecked when initially rendered', () => {
      const { fieldRefinementsComponent } = setup('');
      const animalsCheckbox = fieldRefinementsComponent.getByLabelText('Animals');
      expect(animalsCheckbox['defaultChecked']).toEqual(false);
      expect(animalsCheckbox['checked']).toEqual(false);
    });

    test('checkboxes can be checked and checkbox is not disabled', () => {
      const { fieldRefinementsComponent } = setup('');
      const animalsCheckbox = fieldRefinementsComponent.getByLabelText('Animals');
      expect(animalsCheckbox['checked']).toEqual(false);
      fireEvent.click(animalsCheckbox);
      expect(animalsCheckbox['checked']).toEqual(true);
    });
  });

  describe('checkboxes apply filters', () => {
    test('it adds correct filter when one checkbox within single refinement is checked', () => {
      const { fieldRefinementsComponent, performSearchMock } = setup('');
      const animalsCheckbox = fieldRefinementsComponent.getByLabelText('Animals');
      performSearchMock.mockReset();
      fireEvent.click(animalsCheckbox);
      expect(performSearchMock).toBeCalledTimes(1);
      expect(performSearchMock).toBeCalledWith(
        expect.objectContaining({
          filter: 'subject:Animals'
        })
      );
    });

    test('it adds correct filters when second checkbox within single refinement is checked', () => {
      const { fieldRefinementsComponent, performSearchMock } = setup('subject:Animals');
      const peopleCheckbox = fieldRefinementsComponent.getByLabelText('People');
      performSearchMock.mockReset();
      fireEvent.click(peopleCheckbox);
      expect(performSearchMock).toBeCalledTimes(1);
      expect(performSearchMock).toBeCalledWith(
        expect.objectContaining({
          filter: 'subject:Animals|People'
        })
      );
    });

    test('it adds correct filter when checkboxes from multiple refinements are checked', () => {
      const { fieldRefinementsComponent, performSearchMock } = setup('subject:Animals');
      const newsStaffCheckbox = fieldRefinementsComponent.getByLabelText('News Staff');
      performSearchMock.mockReset();
      fireEvent.click(newsStaffCheckbox);
      expect(performSearchMock).toBeCalledTimes(1);
      expect(performSearchMock).toBeCalledWith(
        expect.objectContaining({
          filter: 'author:News Staff,subject:Animals'
        })
      );
    });
  });

  describe('checkboxes remove filters', () => {
    test('it removes correct filter when checkbox within single refinement is unchecked', () => {
      const { fieldRefinementsComponent, performSearchMock } = setup('subject:Animals');
      const animalsCheckbox = fieldRefinementsComponent.getByLabelText('Animals');
      fireEvent.click(animalsCheckbox);
      // For the test, have to check the checkbox twice to get it in the 'checked' state to uncheck
      performSearchMock.mockReset();
      fireEvent.click(animalsCheckbox);
      expect(performSearchMock).toBeCalledTimes(1);
      expect(performSearchMock).toBeCalledWith(
        expect.objectContaining({
          filter: '',
          offset: 0
        })
      );
    });
  });
});
