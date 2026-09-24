package com.travel.service;

import com.travel.entity.*;
import com.travel.repository.BookingRepository;
import com.travel.repository.TravelPackageRepository;
import com.travel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BookingService {
    private final UserRepository users;
    private final TravelPackageRepository packages;
    private final BookingRepository bookings;

    @Transactional
    public Booking book(String email, Long packageId, int travelers) {
        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unknown user"));
        TravelPackage p = packages.findForUpdate(packageId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Package not found"));
        if (p.getStartDate().isBefore(LocalDate.now()))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Package has already started");
        if (p.getAvailableSeats() < travelers)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only " + p.getAvailableSeats() + " seats left");

        p.setAvailableSeats(p.getAvailableSeats() - travelers);
        Booking b = new Booking();
        b.setUser(user);
        b.setTravelPackage(p);
        b.setTravelers(travelers);
        b.setTotalPrice(p.getPrice().multiply(BigDecimal.valueOf(travelers)));
        b.setStatus(BookingStatus.CONFIRMED);
        b.setCreatedAt(LocalDateTime.now());
        return bookings.save(b);
    }

    @Transactional
    public Booking cancel(Long bookingId, String email, boolean isAdmin) {
        Booking b = bookings.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Booking not found"));
        if (!isAdmin && !b.getUser().getEmail().equals(email))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your booking");
        if (b.getStatus() == BookingStatus.CANCELLED)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already cancelled");

        TravelPackage p = packages.findForUpdate(b.getTravelPackage().getId()).orElseThrow();
        p.setAvailableSeats(p.getAvailableSeats() + b.getTravelers());
        b.setStatus(BookingStatus.CANCELLED);
        return b;
    }
}
