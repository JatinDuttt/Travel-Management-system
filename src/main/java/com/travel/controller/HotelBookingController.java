package com.travel.controller;

import com.travel.entity.HotelBooking;
import com.travel.repository.HotelBookingRepository;
import com.travel.service.HotelBookingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/hotel-bookings")
@RequiredArgsConstructor
public class HotelBookingController {
    private final HotelBookingService service;
    private final HotelBookingRepository stays;

    public record StayRequest(@NotNull Long hotelId, @NotNull LocalDate checkIn, @NotNull LocalDate checkOut,
                              @Min(1) @Max(5) int rooms) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HotelBooking book(@Valid @RequestBody StayRequest r, Authentication auth) {
        return service.book(auth.getName(), r.hotelId(), r.checkIn(), r.checkOut(), r.rooms());
    }

    @GetMapping("/my")
    public List<HotelBooking> mine(Authentication auth) {
        return stays.findByUser_EmailOrderByCreatedAtDesc(auth.getName());
    }

    @DeleteMapping("/{id}") // cancels (keeps the record, frees the rooms)
    public HotelBooking cancel(@PathVariable Long id, Authentication auth) {
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return service.cancel(id, auth.getName(), admin);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<HotelBooking> all() { return stays.findAll(); }
}
