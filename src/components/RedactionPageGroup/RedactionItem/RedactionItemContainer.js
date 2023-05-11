import React, { useCallback, useContext } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import selectors from 'selectors';
import RedactionItem from './RedactionItem';
import core from 'core';
import { RedactionPanelContext } from '../../RedactionPanel/RedactionPanelContext';

const RedactionItemContainer = (props) => {
  const { annotation } = props;

  const { selectedRedactionItemId, setSelectedRedactionItemId } = useContext(RedactionPanelContext);

  const [
    dateFormat,
    language,
    customNoteSelectionFunction,
  ] = useSelector(
    (state) => [
      selectors.getNoteDateFormat(state),
      selectors.getCurrentLanguage(state),
      selectors.getCustomNoteSelectionFunction(state),
    ],
    shallowEqual,
  );

  const textPreview = annotation.getCustomData('trn-annot-preview');
  const iconColor = annotation.StrokeColor.toString();
  const author = core.getDisplayAuthor(annotation['Author']);

  const onRedactionItemSelection = useCallback(() => {
    customNoteSelectionFunction && customNoteSelectionFunction(annotation);
    core.deselectAllAnnotations();
    core.selectAnnotation(annotation);
    core.jumpToAnnotation(annotation);
    setSelectedRedactionItemId(annotation.Id);
  }, [annotation]);

  const onRedactionItemDelete = useCallback(() => {
    core.deleteAnnotations([annotation]);
  }, [annotation]);
  const [isChecked, setIsChecked] = React.useState(false);

  const onCheckChange = (e) => {
    setIsChecked(e.target.checked)
  }

  return (
    <RedactionItem
      dateFormat={dateFormat}
      language={language}
      author={author}
      annotation={annotation}
      iconColor={iconColor}
      textPreview={textPreview}
      onRedactionItemDelete={onRedactionItemDelete}
      onRedactionItemSelection={onRedactionItemSelection}
      isSelected={selectedRedactionItemId === annotation.Id}
      checked={isChecked}
      onCheckChange={onCheckChange}
    />
  );
};

export default RedactionItemContainer;