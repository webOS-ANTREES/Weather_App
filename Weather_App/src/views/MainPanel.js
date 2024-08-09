import React, { useState, useEffect } from 'react';
import Button from '@enact/moonstone/Button';
import css from './MainPanel.module.less';

const apiKey = '4A82wblPrf%2FxbBufFBAfEEcWELP2OxHmcaOdbpOsh8nmBsIUuEkq%2BZ%2BqBSp9Cm%2BbOOYGHUQZZ9dlfPaqNsXFqg%3D%3D';

const MainPanel = () => {
    const [weather, setWeather] = useState({ seoul: {}, daegu: {}, busan: {} });
    const [selectedCity, setSelectedCity] = useState(null);
    const [detailedWeather, setDetailedWeather] = useState({ today: [], tomorrow: [], dayAfterTomorrow: [] });
    const [currentTime, setCurrentTime] = useState(new Date());

    const cities = {
        seoul: { name: '서울', nx: 60, ny: 127 },
        daegu: { name: '대구', nx: 89, ny: 90 },
        busan: { name: '부산', nx: 97, ny: 74 }
    };

    const fetchWeather = async (city) => {
        const { nx, ny } = cities[city];
        const currentDate = getCurrentDate();
        const response = await fetch(`http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${apiKey}&numOfRows=1000&pageNo=1&base_date=${getCurrentDate()}&base_time=0200&dataType=JSON&nx=${nx}&ny=${ny}`);
        const data = await response.json();

        if (data.response.header.resultCode === '00') {
            const items = data.response.body.items.item;
            const closestHour = findClosestHour(items, currentTime);

            const currentWeather = items.reduce((acc, item) => {
                if (item.fcstDate === currentDate && item.fcstTime === closestHour && (item.category === 'TMP' || item.category === 'SKY' || item.category === 'PTY' || item.category === 'REH')) {
                    acc[item.category] = item.fcstValue;
                }
                return acc;
            }, {});

            setWeather(prevWeather => ({
                ...prevWeather,
                [city]: {
                    temperature: currentWeather['TMP'],
                    description: getSkyDescription(currentWeather['SKY'], currentWeather['PTY']),
                    humidity: currentWeather['REH']
                }
            }));
        }
    };

    const findClosestHour = (items, currentTime) => {
        const currentHour = currentTime.getHours();
        const availableHours = items.map(item => parseInt(item.fcstTime.substring(0, 2)));
        let closestHour = availableHours[0];
        for (let i = 1; i < availableHours.length; i++) {
            if (Math.abs(currentHour - availableHours[i]) < Math.abs(currentHour - closestHour)) {
                closestHour = availableHours[i];
            }
        }
        return String(closestHour).padStart(2, '0') + '00';
    };

    const fetchDetailedWeather = async (city) => {
        const { nx, ny } = cities[city];
        const response = await fetch(`http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${apiKey}&numOfRows=1000&pageNo=1&base_date=${getCurrentDate()}&base_time=0200&dataType=JSON&nx=${nx}&ny=${ny}`);
        const data = await response.json();

        if (data.response.header.resultCode === '00') {
            const items = data.response.body.items.item;
            const detailedWeather = items.filter(item => item.category === 'TMP' || item.category === 'REH').map(item => ({
                date: item.fcstDate,
                time: item.fcstTime,
                temperature: item.category === 'TMP' ? item.fcstValue : null,
                humidity: item.category === 'REH' ? item.fcstValue : null
            })).reduce((acc, item) => {
                const existing = acc.find(i => i.date === item.date && i.time === item.time);
                if (existing) {
                    if (item.temperature !== null) existing.temperature = item.temperature;
                    if (item.humidity !== null) existing.humidity = item.humidity;
                } else {
                    acc.push(item);
                }
                return acc;
            }, []);

            detailedWeather.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));

            const today = getCurrentDate();
            const tomorrow = getTomorrowDate();
            const dayAfterTomorrow = getDayAfterTomorrowDate();

            setDetailedWeather({
                today: detailedWeather.filter(item => item.date === today),
                tomorrow: detailedWeather.filter(item => item.date === tomorrow),
                dayAfterTomorrow: detailedWeather.filter(item => item.date === dayAfterTomorrow)
            });
        }
    };

    const getCurrentDate = () => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const getTomorrowDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const getDayAfterTomorrowDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 2);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    };

    const getFormattedDate = (date, time) => {
        const year = date.substring(0, 4);
        const month = date.substring(4, 6);
        const day = date.substring(6, 8);
        const hour = String(parseInt(time.substring(0, 2))).padStart(2, '0');
        return `${year}년 ${month}월 ${day}일 ${hour < 12 ? '오전' : '오후'} ${hour % 12 || 12}시 00분`;
    };

    const getSkyDescription = (sky, pty) => {
        if (pty !== '0') {
            switch (pty) {
                case '1': return '비';
                case '2': return '비/눈';
                case '3': return '눈';
                case '4': return '소나기';
                default: return '';
            }
        } else {
            switch (sky) {
                case '1': return '맑음';
                case '3': return '약간 흐림';
                case '4': return '흐림';
                default: return '';
            }
        }
    };

    useEffect(() => {
        Object.keys(cities).forEach(city => {
            fetchWeather(city);
        });
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000); // 1분마다 현재 시간 업데이트
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (selectedCity) {
            fetchDetailedWeather(selectedCity);
        }
    }, [selectedCity, currentTime]);

    return (
        <div className={css.container}>
            <h1 className={css.title}>날씨 정보</h1>
            <div className={css.currentTime}>
                현재 시간: {currentTime.toLocaleTimeString()}
            </div>
            <div className={css.buttonContainer}>
                {Object.keys(cities).map(city => (
                    <Button
                        key={city}
                        className={css.button}
                        onClick={() => {
                            setSelectedCity(city);
                            fetchDetailedWeather(city);
                        }}
                    >
                        <div className={css.cityName}>{cities[city].name}</div>
                        <div className={css.temperature}>{weather[city]?.temperature}°C</div>
                        <div className={css.humidity}>{weather[city]?.humidity}%</div>
                        <div className={css.description}>{weather[city]?.description}</div>
                    </Button>
                ))}
            </div>
            {selectedCity && (
                <div className={css.weatherContainer}>
                    <h3>오늘</h3>
                    {detailedWeather.today.map((item, index) => (
                        <div key={index} className={css.weatherMain}>
                            <div className={css.time}>{getFormattedDate(item.date, item.time)}</div>
                            <div className={css.temperature}>{item.temperature}°C</div>
                            <div className={css.humidity}>{item.humidity}%</div>
                        </div>
                    ))}
                    <h3>내일</h3>
                    {detailedWeather.tomorrow.map((item, index) => (
                        <div key={index} className={css.weatherMain}>
                            <div className={css.time}>{getFormattedDate(item.date, item.time)}</div>
                            <div className={css.temperature}>{item.temperature}°C</div>
                            <div className={css.humidity}>{item.humidity}%</div>
                        </div>
                    ))}
                    <h3>모레</h3>
                    {detailedWeather.dayAfterTomorrow.map((item, index) => (
                        <div key={index} className={css.weatherMain}>
                            <div className={css.time}>{getFormattedDate(item.date, item.time)}</div>
                            <div className={css.temperature}>{item.temperature}°C</div>
                            <div className={css.humidity}>{item.humidity}%</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MainPanel;
