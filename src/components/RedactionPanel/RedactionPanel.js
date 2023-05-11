import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import classNames from 'classnames';
import Icon from 'components/Icon';
import { Virtuoso } from 'react-virtuoso';
import { RedactionPanelContext } from './RedactionPanelContext';
import { mapAnnotationToRedactionType } from 'constants/redactionTypes';
import CustomRedactionContext from './CustomRedactionContext'
import core from 'core'
import './RedactionPanel.scss';
import RedactionPageGroup from '../RedactionPageGroup';

const RedactionPanel = (props) => {
  const {
    redactionAnnotations,
    applyAllRedactions,
    deleteAllRedactionAnnotations,
    redactionTypesDictionary,
  } = props;

  const { t } = useTranslation();
  const [redactionPageMap, setRedactionPageMap] = useState({});
  const [redactionPageNumbers, setRedactionPageNumbers] = useState([]);
  // The following prop is needed only for the tests to actually render a list of results
  // it only is ever injected in the tests
  const { isTestMode } = useContext(RedactionPanelContext);

  useEffect(() => {
    const redactionPageMap = {};
    redactionAnnotations.forEach((annotation) => {
      const redactionType = mapAnnotationToRedactionType(annotation);
      const { label, icon } = redactionTypesDictionary[redactionType];
      annotation.label = label;
      annotation.icon = icon;
      annotation.redactionType = redactionType;

      const pageNumber = annotation.PageNumber;
      if (redactionPageMap[pageNumber] === undefined) {
        redactionPageMap[pageNumber] = [annotation];
      } else {
        redactionPageMap[pageNumber] = [annotation, ...redactionPageMap[pageNumber]];
      }
    });
    setRedactionPageMap(redactionPageMap);
    setRedactionPageNumbers(Object.keys(redactionPageMap));
  }, [redactionAnnotations]);

  const renderRedactionPageGroups = () => {
    // Needed for the tests to actually render a list of results
    // Not needed for the actual app; if we set it it kills performance when there are a lot of annotations
    const testModeProps = isTestMode ? { initialItemCount: redactionPageNumbers.length } : {};
    return (
      <div className="redaction-group-container" role="list">
        <CustomRedactionContext.Provider value={(id, checked) => {
          for (let page in redactionPageMap) {
            const currentPage = redactionPageMap[page]
            for (let i = 0; i < currentPage.length; i++) {
              if (currentPage[i].Id === id) {
                const cloned = { ...redactionPageMap };
                cloned[page][i].markChecked = checked;
                setRedactionPageMap(cloned)
                break;
              }
            }
          }
        }}>

          <Virtuoso
            data={redactionPageNumbers}
            itemContent={(index, pageNumber) => {
              return (
                <RedactionPageGroup
                  key={index}
                  pageNumber={pageNumber}
                  redactionItems={redactionPageMap[pageNumber]}
                />);
            }}
            {...testModeProps}
          />
        </CustomRedactionContext.Provider>
      </div>
    );
  };

  const noRedactionAnnotations = (
    <div className="no-marked-redactions">
      <div>
        <Icon className="empty-icon" glyph="icon-no-marked-redactions" />
      </div>
      <div className="msg">{t('redactionPanel.noMarkedRedactions')}</div>
    </div>
  );

  const redactAllButtonClassName = classNames('redact-all-marked', { disabled: redactionAnnotations.length === 0 });
  const clearAllButtonClassName = classNames('clear-all-marked', { disabled: redactionAnnotations.length === 0 });
  const canShowCommit = useMemo(() => {
    let res = false;
    for (let page in redactionPageMap) {
      const currentPage = redactionPageMap[page]
      for (let i = 0; i < currentPage.length; i++) {
        if (currentPage[i].markChecked) {
          res = true
          break;
        }
      }
    }
    return res
  }, [redactionPageMap])

  return (
    <>
      <div className="marked-redaction-counter">
        <span>{t('redactionPanel.redactionCounter')}</span> {`(${redactionAnnotations.length})`}
        {<button onClick={() => {
          const annotations = [];
          for (let page in redactionPageMap) {
            const currentPage = redactionPageMap[page]
            for (let i = 0; i < currentPage.length; i++) {
              if (currentPage[i].markChecked === true) {
                annotations.push(currentPage[i])
              }
            }
          }
          core.getAnnotationManager().trigger('commitClick', { annotations });
        }} disabled={!canShowCommit} className='redaction-commit-category' style={{ background: '#000', color: '#fff' }}>Add Category</button>}
      </div>
      {redactionPageNumbers.length > 0 ? renderRedactionPageGroups() : noRedactionAnnotations}
      <div className="redaction-panel-controls">
        <button
          disabled={redactionAnnotations.length === 0}
          className={clearAllButtonClassName}
          onClick={deleteAllRedactionAnnotations}
          aria-label={t('redactionPanel.clearMarked')}
        >
          {t('redactionPanel.clearMarked')}
        </button>
        <button
          disabled={redactionAnnotations.length === 0}
          className={redactAllButtonClassName}
          onClick={applyAllRedactions}
          aria-label={t('redactionPanel.redactAllMarked')}
        >
          {t('redactionPanel.redactAllMarked')}
        </button>
      </div>
    </>
  );
};

export default RedactionPanel;