import { Component, createEffect, createMemo, createSignal, onCleanup, onMount, Show } from 'solid-js';

import styles from './EmojiPickPopover.module.scss';
import { EmojiOption } from '../../types/primal';
import EmojiPicker from '../EmojiPicker/EmojiPicker';
import EmojiPickHeader from './EmojiPickHeader';
import { useAccountContext } from '../../contexts/AccountContext';
import { defaultEmojiReacts } from '../../constants';
import { mergeArrays } from '../../utils';

const defaultTerm = 'face';

const EmojiPickPopover: Component<{
  id?: string,
  onClose: (e: MouseEvent | KeyboardEvent) => void,
  onSelect: (emoji: EmojiOption) => void,
  onMouseLeave?: (e: MouseEvent) => void,
  orientation?: 'up' | 'down',
  compact?: boolean,
}> = (props) => {

  const account = useAccountContext();

  const [emojiSearchTerm, setEmojiSearchTerm] = createSignal(defaultTerm);
  const [focusInput, setFocusInput] = createSignal(false);
  const [showPreset, setShowPreset] = createSignal(true);
  const [isCompact, setIsCompact] = createSignal(props.compact || false)

  const presetEmoji = createMemo(() => {
    let preset = account?.emojiHistory || [];
    if (isCompact()) {
      // fill up preset with default emoji up to a total of 8
      const defaultEmoji: EmojiOption[] =
        defaultEmojiReacts.map(e => ({ name: e, keywords: []}))
      preset = mergeArrays(preset, defaultEmoji, (a, b) => a.name === b.name).slice(0, 8);
    }
    return preset;
  })

  const onKey = (e: KeyboardEvent) => {
    e.stopPropagation();
    if (e.code === 'Escape') {
      props.onClose(e);
      return;
    }
  };

  createEffect(() => {
    if (emojiSearchTerm().length === 0) {
      setEmojiSearchTerm(() => defaultTerm)
    }
  });

  const setFilter = (filter: string) => {
    if (filter === 'default') {
      setShowPreset(true);
      setEmojiSearchTerm(() => defaultTerm);
    }
    else {
      setShowPreset(false);
      setEmojiSearchTerm(() => filter);
    }
  };

  const onClickOutside = (e: MouseEvent) => {
    props.onClose(e);
  };

  const onEmojiSearch = (term: string) => {
    setEmojiSearchTerm(() => term);
    setShowPreset(() => term.length === 0);
  };

  onMount(() => {
    setTimeout(() => {
      setEmojiSearchTerm(() => defaultTerm);
      setFocusInput(() => true);
      setFocusInput(() => false);
      window.addEventListener('keyup', onKey);
      window.addEventListener('click', onClickOutside);
    }, 10);
  });

  onCleanup(() => {
    window.removeEventListener('keyup', onKey);
    window.removeEventListener('click', onClickOutside);
  });


  return (
    <div
      id={props.id}
      class={`${styles.emojiPickHolder} ${props.orientation && styles[props.orientation]} ${props.compact && styles.compact}`}
      onMouseLeave={e => props.onMouseLeave && props.onMouseLeave(e)}
      onClick={e => e.stopPropagation()}
    >
      <div
        class={`${styles.zapEmojiChangeModal} ${isCompact() ? styles.compact : ''}`}
      >
        <Show when={!isCompact()}>
          <EmojiPickHeader
            focus={focusInput()}
            onInput={onEmojiSearch}
            onFilter={setFilter}
          />
        </Show>

        <EmojiPicker
          showPreset={showPreset()}
          preset={presetEmoji()}
          presetOnly={isCompact()}
          filter={emojiSearchTerm()}
          onSelect={(emoji: EmojiOption) => {
            props.onSelect(emoji);
            setFocusInput(true);
            setFocusInput(() => false);
          }}
          short={props.orientation === 'up'}
        />

        <button
          class={`${styles.contextButton} ${!isCompact() && styles.hidden}`}
          onClick={() => setIsCompact(false)}
        >
          <div class={styles.contextIcon} ></div>
        </button>
      </div>
    </div>
  );
}

export default EmojiPickPopover;
