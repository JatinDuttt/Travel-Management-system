package com.travel.controller;

import com.travel.entity.Booking;
import com.travel.repository.BookingRepository;
import com.travel.service.BookingService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {
    private final BookingService service;
    private final BookingRepository bookings;

    public record BookingRequest(@NotNull Long packageId, @Min(1) @Max(10) int travelers) {}

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Booking book(@Valid @RequestBody BookingRequest r, Authentication auth) {
        return service.book(auth.getName(), r.packageId(), r.travelers());
    }

    @GetMapping("/my")
    public List<Booking> mine(Authentication auth) {
    	   return bookings.findByUser_EmailOrderByCreatedAtDesc(auth.getName());
    }

    @DeleteMapping("/{id}") // cancels (keeps the record, restores seats)
    public Booking cancel(@PathVariable Long id, Authentication auth) {
        boolean admin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return service.cancel(id, auth.getName(), admin);
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<Booking> all() { return bookings.findAll(); }
}
