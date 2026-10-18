package com.travel.service;

import com.travel.entity.*;
import com.travel.repository.HotelBookingRepository;
import com.travel.repository.HotelRepository;
import com.travel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class HotelBookingService {
    static final int MAX_NIGHTS = 30;

    private final UserRepository users;
    private final HotelRepository hotels;
    private final HotelBookingRepository stays;

    @Transactional
    public HotelBooking book(String email, Long hotelId, LocalDate checkIn, LocalDate checkOut, int rooms) {
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
        long nights = ChronoUnit.DAYS.between(checkIn, checkOut);
        if (nights < 1)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-out must be after check-in");
        if (nights > MAX_NIGHTS)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "You can book at most " + MAX_NIGHTS + " nights at a time");
        if (checkIn.isBefore(LocalDate.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check-in date has already passed");

        Hotel h = hotels.findForUpdate(hotelId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hotel not found"));
        if (rooms > h.getRooms())
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This hotel only has " + h.getRooms() + " rooms");

        // Availability is per night: every night of the stay needs enough free rooms.
        List<HotelBooking> overlapping = stays.findOverlapping(hotelId, checkIn, checkOut, BookingStatus.CONFIRMED);
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            int taken = 0;
            for (HotelBooking s : overlapping)
                if (!night.isBefore(s.getCheckIn()) && night.isBefore(s.getCheckOut())) taken += s.getRooms();
            if (taken + rooms > h.getRooms())
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Only " + (h.getRooms() - taken) + " room(s) free on " + night);
        }

        HotelBooking b = new HotelBooking();
        b.setUser(user);
        b.setHotel(h);
        b.setCheckIn(checkIn);
        b.setCheckOut(checkOut);
        b.setRooms(rooms);
        b.setTotalPrice(h.getPricePerNight().multiply(BigDecimal.valueOf(nights)).multiply(BigDecimal.valueOf(rooms)));
        b.setStatus(BookingStatus.CONFIRMED);
        b.setCreatedAt(LocalDateTime.now());
        return stays.save(b);
    }

    @Transactional
    public HotelBooking cancel(Long id, String email, boolean isAdmin) {
        HotelBooking b = stays.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Stay not found"));
        if (!isAdmin && !b.getUser().getEmail().equals(email))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your booking");
        if (b.getStatus() == BookingStatus.CANCELLED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already cancelled");
        b.setStatus(BookingStatus.CANCELLED); // rooms free up automatically: availability is computed from CONFIRMED stays
        return b;
    }
}
