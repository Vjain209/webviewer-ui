import React, { useEffect, useState, useContext, useMemo , useRef} from 'react';
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
import { connect } from 'react-redux';

const RedactionPanel = (props) => {
  const {
    redactionAnnotations,
    applyAllRedactions,
    deleteAllRedactionAnnotations,
    redactionTypesDictionary,
    style
  } = props;

  const { t } = useTranslation();
  const [redactionPageMap, setRedactionPageMap] = useState({});
  const [redactionPageNumbers, setRedactionPageNumbers] = useState([]);
  // The following prop is needed only for the tests to actually render a list of results
  // it only is ever injected in the tests
  const { isTestMode, selectedRedactionItemId, setSelectedRedactionItemId } = useContext(RedactionPanelContext);

  const refid = useRef(null);
  const prevPage = useRef(null)
  const scrollIntoViewById = (id) => {
    if (id) {
      const el = document.querySelector('#annotation-' + id);
      if(el) {
        el.scrollIntoView({behavior: 'smooth'});
      }
    }
  }
  useEffect(() => {
    const onKeyDownHandler = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (refid.current.selectedRedactionItemId) {
          for (let page in refid.current.redactionPageMap) {
            const currentPage = refid.current.redactionPageMap[page]
            for (let i = 0; i < currentPage.length; i++) {
              if (currentPage[i].Id === refid.current.selectedRedactionItemId) {
                // check if we've another item after this one
                if (currentPage[i - 1]) {
                  const currentAnnotation = currentPage[i - 1]
                  core.deselectAllAnnotations();
                  core.selectAnnotation(currentAnnotation);
                  core.jumpToAnnotation(currentAnnotation);
                  setSelectedRedactionItemId(currentAnnotation.Id);
                  scrollIntoViewById(currentAnnotation.Id)
                  break;
                } else if (prevPage.current) {
                  if (refid.current.redactionPageMap[prevPage.current]) {
                    const currentAnnotation = refid.current.redactionPageMap[prevPage.current][refid.current.redactionPageMap[prevPage.current].length - 1]
                    core.deselectAllAnnotations();
                    core.selectAnnotation(currentAnnotation);
                    core.jumpToAnnotation(currentAnnotation);
                    setSelectedRedactionItemId(currentAnnotation.Id)
                    scrollIntoViewById(currentAnnotation.Id)
                    break;
                  }
                }
              }
            }
            prevPage.current = page;
          }
        }
      }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        if (refid.current.selectedRedactionItemId) {
          for (let page in refid.current.redactionPageMap) {
            const currentPage = refid.current.redactionPageMap[page]
            for (let i = 0; i < currentPage.length; i++) {
              if (currentPage[i].Id === refid.current.selectedRedactionItemId) {
                // check if we've another item after this one
                if (currentPage[i + 1]) {
                  const currentAnnotation = currentPage[i + 1]
                  core.deselectAllAnnotations();
                  core.selectAnnotation(currentAnnotation);
                  core.jumpToAnnotation(currentAnnotation);
                  setSelectedRedactionItemId(currentAnnotation.Id)
                  scrollIntoViewById(currentAnnotation.Id)
                  break;
                }
                else {
                  const keys = Object.keys(refid.current.redactionPageMap);
                  const theOne = keys.findIndex(val => val === page);
                  if (theOne !== -1) {
                    const needed = refid.current.redactionPageMap[keys[theOne + 1]];
                    if (needed) {
                      const id = needed[0].Id
                      core.deselectAllAnnotations();
                      core.selectAnnotation(needed[0]);
                      core.jumpToAnnotation(needed[0]);
                      setSelectedRedactionItemId(id)
                      scrollIntoViewById(id)
                      return
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    // add listener
    window.addEventListener('keydown', onKeyDownHandler, {
      capture: true,
      passive: false
    })
    // prevent memory leak
    return () => {
      window.removeEventListener('keydown', onKeyDownHandler);
    }
  }, [])
  useEffect(() => {
    refid.current = { selectedRedactionItemId, redactionPageMap };
  }, [selectedRedactionItemId, redactionPageMap])

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

        <button disabled={!canShowCommit} style={{ background: '#000', color: '#fff' }} className='redaction-commit-category' onClick={() => {
          for (let page in redactionPageMap) {
            const currentPage = redactionPageMap[page]
            const cloned = { ...redactionPageMap };
            for (let i = 0; i < currentPage.length; i++) {
              if (currentPage[i].markChecked === true) {
                const { FillColor, OverlayText, TextColor, StrokeColor, Font, FontSize, Opacity, StrokeThickness, TextAlign } = style
                cloned[page][i].FillDisplayColor = FillColor;
                cloned[page][i].OverlayText = OverlayText;
                cloned[page][i].TextColor = TextColor;
                cloned[page][i].StrokeColor = StrokeColor;
                cloned[page][i].Font = Font;
                cloned[page][i].FontSize = FontSize;
                cloned[page][i].Opacity = Opacity;
                cloned[page][i].StrokeThickness = StrokeThickness;
                cloned[page][i].TextAlign = TextAlign;

                console.log(style)
                // cloned[page][i] = {...cloned[page][i], FillColor, OverlayText, TextColor, StrokeColor}
              }
            }
            setRedactionPageMap(cloned)
          }
        }}>
          Update style
        </button>

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


const mapStateToProps = (state) => ({
  style: state.viewer.activeToolStyles
});

export default connect(mapStateToProps)(RedactionPanel);