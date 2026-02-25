import { useEffect, useState } from "react";

import { Button, Link } from "@heroui/react";

import { RiTwitterXLine } from "react-icons/ri";

import { RecordGetByIdResponseType } from "@app/types/record";
import { OfficialEventGetByIdResponseType } from "@app/types/official_event";
import { TonamelEventGetByIdResponseType } from "@app/types/tonamel_event";
import { DeckGetByIdResponseType } from "@app/types/deck";
import { DeckCodeType } from "@app/types/deck_code";
import { MatchGetResponseType } from "@app/types/match";

function toFullWidth(str: string) {
  str = str.replace(/[A-Za-z0-9]/g, function (s) {
    return String.fromCharCode(s.charCodeAt(0) + 0xfee0);
  });

  return str;
}

async function fetchOfficialEventById(id: number) {
  try {
    const res = await fetch(`/api/official_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: OfficialEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchTonamelEventById(id: string) {
  try {
    const res = await fetch(`/api/tonamel_events/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: TonamelEventGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchDeckById(id: string) {
  try {
    const res = await fetch(`/api/decks/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckGetByIdResponseType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchDeckCodeById(id: string) {
  try {
    const res = await fetch(`/api/deckcodes/${id}`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: DeckCodeType = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

async function fetchMatches(record_id: string) {
  try {
    const res = await fetch(`/api/records/${record_id}/matches`, {
      cache: "no-store",
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch");
    }

    const ret: MatchGetResponseType[] = await res.json();

    return ret;
  } catch (error) {
    throw error;
  }
}

type Props = {
  record: RecordGetByIdResponseType | null;
};

export default function TweetButton({ record }: Props) {
  const [officialEvent, setOfficialEvent] =
    useState<OfficialEventGetByIdResponseType | null>(null);
  const [tonamelEvent, setTonamelEvent] =
    useState<TonamelEventGetByIdResponseType | null>(null);
  const [deck, setDeck] = useState<DeckGetByIdResponseType | null>(null);
  //const [deckcode, setDeckCode] = useState<DeckCodeType | null>(null);
  const [matches, setMatches] = useState<MatchGetResponseType[] | null>(null);

  useEffect(() => {
    if (!record) return;

    const fetchOfficialEventByIdData = async () => {
      try {
        const data = await fetchOfficialEventById(record.official_event_id);
        data.title = data.title.replace(/【.*?】ポケモンカードジム　/g, "");
        data.title = data.title.replace(
          /【.*?】エクストラバトルの日/g,
          "エクストラバトルの日",
        );
        data.title = data.title.replace(/【.*?】ポケモンカードゲーム　/g, "");
        data.title = data.title.replace(/ポケモンカードゲーム /g, "");
        data.title = data.title.replace(/（オープンリーグ）/g, "");
        data.title = data.title.replace(/（マスターリーグ）/g, "");
        data.title = data.title.replace(/（シニアリーグ）/g, "");
        data.title = data.title.replace(/（ジュニアリーグ）/g, "");
        data.title = data.title.replace(/（スタンダード）/g, "");
        data.title = data.title.replace(/（.*?）/g, "");

        setOfficialEvent(data);
      } catch (err) {
        console.log(err);
      } finally {
      }
    };

    const fetchTonamelEventByIdData = async () => {
      try {
        const data = await fetchTonamelEventById(record.tonamel_event_id);
        setTonamelEvent(data);
      } catch (err) {
        console.log(err);
      } finally {
      }
    };

    const fetchDeckByIdData = async () => {
      try {
        const data = await fetchDeckById(record.deck_id);
        setDeck(data);
      } catch (err) {
        console.log(err);
      } finally {
      }
    };

    /*
    const fetchDeckCodeByIdData = async () => {
      try {
        const data = await fetchDeckCodeById(record.deck_code_id);
        setDeckCode(data);
      } catch (err) {
        console.log(err);
      } finally {
      }
    };
    */

    const fetchMatchesData = async () => {
      try {
        const data = await fetchMatches(record.id);
        setMatches(data);
      } catch (err) {
        console.log(err);
      } finally {
      }
    };

    if (record.official_event_id !== 0) {
      fetchOfficialEventByIdData();
    } else if (record.tonamel_event_id !== "") {
      fetchTonamelEventByIdData();
    }

    if (record.deck_id) {
      fetchDeckByIdData();
    }

    /*
    if (record.deck_code_id) {
      fetchDeckCodeByIdData();
    }
    */

    fetchMatchesData();
  }, [record]);

  let encoded = "";
  let results = "";

  if (matches && matches.length !== 0) {
    results = "\n" + results + "対戦結果" + "\n";
    matches?.map((match, index) => {
      const victory = match.victory_flg ? String("⭕") : String("❌");
      const go_first =
        match.default_victory_flg || match.default_defeat_flg
          ? String("　")
          : match.games[0].go_first
            ? String("先")
            : String("後");
      const number = toFullWidth(Number(index + 1).toString());
      const opponents_deck_info = match.default_victory_flg
        ? String("不戦勝")
        : match.default_defeat_flg
          ? String("不戦敗")
          : match.opponents_deck_info;
      results =
        results + " " + victory + " " + go_first + " " + opponents_deck_info + "\n";
    });
  }

  if (officialEvent) {
    /*
    const startedAtDate = new Date(officialEvent.started_at);
    let startedAt =
      startedAtDate.getHours().toString().padStart(2, "0") +
      ":" +
      startedAtDate.getMinutes().toString().padStart(2, "0");
    const endedAtDate = new Date(officialEvent.ended_at);
    let endedAt =
      endedAtDate.getHours().toString().padStart(2, "0") +
      ":" +
      endedAtDate.getMinutes().toString().padStart(2, "0");
    let eventTime = "";

    if (endedAt == "00:00") {
      endedAt = "";
    }
    if (startedAt == "00:00") {
      startedAt = "";
    }
    if (startedAt != "") {
      eventTime = startedAt + " ~ ";
      if (endedAt != "") {
        eventTime = eventTime + endedAt;
      }
    }

    const datetime =
      new Date(officialEvent.date).toLocaleString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "short",
      }) +
      " " +
      eventTime;
    */

    const shopName = officialEvent.shop_name
      ? officialEvent.shop_name
      : officialEvent.venue;

    encoded = encodeURIComponent(
      //officialEvent.title + "\n" + datetime + "\n" + shopName + "\n" + results + "\n",
      officialEvent.title + "\n" + shopName + "\n" + results + "\n",
    );
  } else if (tonamelEvent) {
    encoded = encodeURIComponent(tonamelEvent.title + "\n" + results + "\n");
  }

  if (deck && deck.name !== "") {
    encoded = encoded + encodeURIComponent("使用デッキ：" + deck.name + "\n");
  }

  let hashtag = encodeURIComponent("バトレコ");
  const href =
    `https://twitter.com/intent/tweet?text=` +
    encoded +
    `&via=` +
    "vsrecorder_mobi" +
    `&hashtags=` +
    hashtag;

  return (
    <Link href={href} className="text-black text-sm w-full">
      <Button color="default" onPress={() => {}} className="font-bold w-full">
        <div className="flex items-center gap-1">
          <RiTwitterXLine />
          この対戦結果をポストする
        </div>
      </Button>
    </Link>
  );
}
