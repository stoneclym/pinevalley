import type { ScreenName } from "../App";
import type { HubConfig } from "../config";
import { COPY } from "../copy";
import { useCalendar } from "../ha/calendar";
import { type CalEvent, todayView, weekView } from "../lib/events";
import { formatLongDate, formatShortDate, formatTime, shortWeekday } from "../lib/time";
import { useNow } from "../lib/useNow";
import { BackHeader } from "../ui/BackHeader";
import { barFill, PersonDots, personInfo } from "../ui/PersonMarks";
import { Screen } from "./Screen";
import "./Calendar.css";

/** `8:30 AM – 9:30 AM`. */
function timeRange(e: CalEvent): string {
  return `${formatTime(e.start)} – ${formatTime(e.end)}`;
}

export function Calendar({ config, go }: { config: HubConfig; go: (s: ScreenName) => void }) {
  const now = useNow();
  const { events, loaded } = useCalendar(config.calendars);
  const today = todayView(events, now);
  const week = weekView(events, now).filter((d) => d.allDay.length || d.timed.length);
  const todayEmpty = loaded && !today.allDay.length && !today.timed.length;

  return (
    <Screen calm className="detail">
      <BackHeader title="Calendar" detail={formatShortDate(now)} onBack={() => go("home")} />
      <div className="cal-panels">
        <section className="glass cal-today" aria-label="Today">
          <div className="cal-today-head">
            <h2>Today</h2>
            <span>{formatLongDate(now)}</span>
          </div>
          <div className="cal-scroll">
            {today.allDay.map((e) => {
              const p = personInfo(e, config.people);
              return (
                <div key={e.id} className="cal-allday">
                  <span className="caps">All day</span>
                  <PersonDots colors={p.colors} />
                  <span className="cal-allday-title">{p.title}</span>
                </div>
              );
            })}
            <div className="cal-events">
              {today.timed.map((e) => {
                const isNext = e === today.next;
                const p = personInfo(e, config.people);
                return (
                  <div key={e.id} className={`cal-event ${isNext ? "white-glass cal-event-next" : ""}`}>
                    <span className="cal-bar" style={barFill(p.colors)} />
                    <span className="cal-event-text">
                      <span className="cal-event-title">{p.title}</span>
                      <span className="cal-event-meta">
                        {timeRange(e)}
                        {e.location ? ` · ${e.location}` : ""}
                      </span>
                    </span>
                    {isNext && <span className="cal-next-label">Next</span>}
                  </div>
                );
              })}
            </div>
            {todayEmpty && COPY.nothingToday && <p className="quiet cal-empty">{COPY.nothingToday}</p>}
          </div>
        </section>

        <section className="glass cal-week" aria-label="This week">
          <h2 className="caps cal-week-head">This week</h2>
          <div className="cal-scroll">
            {week.map((d) => (
              <div key={d.date.toISOString()} className="cal-day">
                <span className="cal-day-date">
                  <span className="cal-day-wd">{shortWeekday(d.date)}</span>
                  <span className="cal-day-num">{d.date.getDate()}</span>
                </span>
                <span className="cal-day-events">
                  {[...d.allDay, ...d.timed].map((e) => {
                    const p = personInfo(e, config.people);
                    return (
                      <span key={e.id} className="cal-line">
                        <span className="cal-line-time">{e.allDay ? "All day" : formatTime(e.start)}</span>
                        <PersonDots colors={p.colors} />
                        <span className="cal-line-title">{p.title}</span>
                      </span>
                    );
                  })}
                </span>
              </div>
            ))}
            {loaded && week.length === 0 && COPY.nothingThisWeek && (
              <p className="quiet cal-empty cal-week-empty">{COPY.nothingThisWeek}</p>
            )}
          </div>
        </section>
      </div>
    </Screen>
  );
}
