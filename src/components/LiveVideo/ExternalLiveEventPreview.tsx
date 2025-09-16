import { Component, createEffect, createSignal, on, onMount, Show } from 'solid-js';
import { useMediaContext } from '../../contexts/MediaContext';
import { hookForDev } from '../../lib/devTools';
import Hls from 'hls.js';

import styles from './LiveVideo.module.scss';
import { getStreamingEvent, StreamingData } from '../../lib/streaming';
import { PrimalUser } from '../../types/primal';
import { useAppContext } from '../../contexts/AppContext';
import Avatar from '../Avatar/Avatar';
import { createStore } from 'solid-js/store';
import { fetchPeople } from '../../megaFeeds';
import { APP_ID } from '../../App';
import { nip05Verification, userName } from '../../stores/profile';
import VerificationCheck from '../VerificationCheck/VerificationCheck';
import { date } from '../../lib/dates';
import { decodeIdentifier } from '../../lib/keys';

const ExternalLiveEventPreview: Component<{
  url: string,
  user?: PrimalUser,
}> = (props) => {
  const app = useAppContext();

  const [people, setPeople] = createStore<PrimalUser[]>([]);
  const [fetchingPeople, setFetchingPeople] = createSignal(false);

  const [firstHost, setFirstHost] = createSignal<PrimalUser>();

  const [stream, setStream] = createSignal<StreamingData>();

  const fetchStream = async (naddr: string) => {
    const decoded = decodeIdentifier(naddr);

    if (decoded.type !== 'naddr' || typeof decoded.data === 'string') return;

    const { identifier, pubkey } = decoded.data;

    const str = await getStreamingEvent(identifier, pubkey);

    setStream(() => ({ ...str }));
  }

  const fetchMissingUsers = async (pubkeys: string[]) => {
    const subId = `fetch_missing_people_${stream()?.id}_${APP_ID}`;

    const pks = pubkeys.reduce<string[]>((acc, pk) => {
      return acc.includes(pk) ? acc : [...acc, pk];
    }, [])

    setFetchingPeople(true);
    const { users } = await fetchPeople(pks, subId);

    setPeople((peps) => [ ...peps, ...users]);

    const hostPubkey = stream()?.hosts?.[0];

    const host = users.find(u => u.pubkey === hostPubkey) || users.find(u => u.pubkey === stream()?.pubkey);

    if (host) {
      setFirstHost(() => ({ ...host }));
    }

    setFetchingPeople(false);
  }

  onMount(() => {
    const urlSections = props.url.split('/');
    const naddr = urlSections[urlSections.length - 1];

    if (naddr.startsWith('naddr1')) {
      fetchStream(naddr);
    }
  });

  createEffect(() => {
    const str = stream();

    let pks = [...(str?.participants || [])];

    if (props.user) {
      setFirstHost(props.user);
      return;
    }

    if (str?.pubkey) {
      pks.push(str.pubkey)
    }

    fetchMissingUsers(pks);
  });

  const liveHref = () => {
    const event = stream();

    if (!event) return '';

    return `${app?.actions.profileLink(event.pubkey, true)}/live/${event.id}`;
  }

  return (
    <a class={styles.liveEventPreview} href={liveHref()} >
      <Avatar size="vs2" user={firstHost()} />
      <div class={styles.streamInfo}>
        <div class={styles.header}>
          <div class={styles.name}>{userName(firstHost())}</div>
          <VerificationCheck user={firstHost()} />
          <div class={styles.nip05}>{nip05Verification(firstHost())}</div>
        </div>
        <div class={styles.title}>{stream()?.title}</div>
        <div class={styles.stats}>
          <div class={styles.time}>
            <Show
              when={stream()?.status === 'live'}
              fallback={<>Stream ended {date(stream()?.starts || 0).label} ago</>}
            >
              Started {date(stream()?.starts || 0).label} ago
            </Show>
          </div>
          <div class={styles.participants}>
            <div class={styles.participantsIcon}></div>
            {stream()?.currentParticipants || 0}
          </div>
        </div>
      </div>

      <div class={styles.liveBadge}>
        <Show when={stream()?.status === 'live'}>
          <div class={styles.liveDot}>  </div>
          Live
        </Show>
      </div>
    </a>
  );
}

export default hookForDev(ExternalLiveEventPreview);
